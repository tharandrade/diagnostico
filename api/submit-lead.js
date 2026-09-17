/* =========================================================
   /api/submit-lead — Recebe o lead da etapa 4 do quiz (já
   validado no navegador por form-validation.js) e o repassa
   SERVER-SIDE para o webhook do Make.com, aguardando a resposta
   real antes de confirmar sucesso ao frontend.

   Este é o único lugar que decide se "o formulário foi enviado
   com sucesso": só responde { ok: true } quando o Make responde
   com um status HTTP de sucesso de verdade. O frontend
   (quiz-engine.js) só dispara Lead/CAPI e mostra a tela de
   confirmação quando recebe { ok: true } daqui — nunca antes.

   Variável de ambiente esperada (configurar na Vercel):
     MAKE_WEBHOOK_URL (obrigatória — URL do "Custom Webhook" do
     cenário do Make.com). Saiu do config.js/frontend nesta
     correção: não faz mais sentido expor a URL do webhook no
     código-fonte do navegador quando o próprio servidor pode
     chamá-la diretamente.

   Sem essa variável configurada, o endpoint responde ok:false —
   nunca finge sucesso.
   ========================================================= */

const { isAllowedOrigin } = require("./_lib/security");

const MAKE_TIMEOUT_MS = 8000;

const MAX_LEN = {
  nome: 200,
  whatsapp: 40,
  email: 200,
  pagina_origem: 2000,
  timestamp: 60,
  utm: 200,
  respostaChave: 60,
  respostaValor: 300,
};

function isNonEmptyString(v, maxLen) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

function optionalString(v, maxLen) {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string" || v.length > maxLen) return null;
  return v;
}

/** Só aceita um objeto plano de string->string com poucas chaves —
    é exatamente o formato { campo: resposta } que o quiz já monta;
    rejeita qualquer coisa fora disso (array, aninhado, chaves demais). */
function sanitizeRespostas(respostas) {
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) return null;
  const keys = Object.keys(respostas);
  if (keys.length === 0 || keys.length > 10) return null;
  const clean = {};
  for (const k of keys) {
    const v = respostas[k];
    if (k.length > MAX_LEN.respostaChave) return null;
    if (typeof v !== "string" || v.length > MAX_LEN.respostaValor) return null;
    clean[k] = v;
  }
  return clean;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "method_not_allowed" });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ ok: false, reason: "origin_not_allowed" });
    return;
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(
      "[submit-lead] MAKE_WEBHOOK_URL não configurado na Vercel — lead não repassado ao Make."
    );
    res.status(200).json({ ok: false, reason: "missing_webhook_url" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const nome = isNonEmptyString(body.nome, MAX_LEN.nome) ? body.nome.trim() : null;
  const whatsapp = isNonEmptyString(body.whatsapp, MAX_LEN.whatsapp) ? body.whatsapp.trim() : null;
  const email = isNonEmptyString(body.email, MAX_LEN.email) ? body.email.trim() : null;
  const respostas = sanitizeRespostas(body.respostas);
  const pagina_origem = isNonEmptyString(body.pagina_origem, MAX_LEN.pagina_origem)
    ? body.pagina_origem
    : null;

  if (!nome || !whatsapp || !email || !respostas || !pagina_origem) {
    res.status(400).json({ ok: false, reason: "invalid_payload" });
    return;
  }

  /* Whitelist estrita: só repassamos exatamente estes campos ao Make
     (o mesmo formato que o site já enviava direto do navegador) —
     nunca o body bruto do cliente, para não permitir injeção de
     campos arbitrários no payload do cenário do Make. */
  const payload = {
    nome,
    whatsapp,
    email,
    respostas,
    utm_source: optionalString(body.utm_source, MAX_LEN.utm),
    utm_medium: optionalString(body.utm_medium, MAX_LEN.utm),
    utm_campaign: optionalString(body.utm_campaign, MAX_LEN.utm),
    pagina_origem,
    timestamp: isNonEmptyString(body.timestamp, MAX_LEN.timestamp)
      ? body.timestamp
      : new Date().toISOString(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAKE_TIMEOUT_MS);

  try {
    const makeRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!makeRes.ok) {
      console.error("[submit-lead] Make respondeu com erro:", makeRes.status);
      res.status(502).json({ ok: false, reason: "make_error" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err.name === "AbortError" ? "make_timeout" : "make_unreachable";
    console.error("[submit-lead] Falha ao repassar lead ao Make:", reason, err.message);
    res.status(502).json({ ok: false, reason });
  }
};
