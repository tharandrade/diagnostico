/* =========================================================
   /api/meta-capi — Função serverless (Vercel, Node.js, zero
   dependências) que recebe o Lead do frontend (analytics.js,
   sendLeadToCapi()) e reenvia o MESMO evento para a Meta
   Conversions API, com o MESMO event_id do Pixel do navegador,
   para a Meta deduplicar as duas chegadas.

   Chamada SOMENTE depois do sucesso real do formulário (ver
   quiz-engine.js) — nunca em validação, clique ou falha.

   Variáveis de ambiente esperadas (configurar na Vercel):
     META_PIXEL_ID          (opcional — usa 1617277909405709 se ausente)
     META_CAPI_ACCESS_TOKEN (obrigatório — token privado, NUNCA no frontend)

   Sem o token configurado, o endpoint responde 200 informando
   que o evento não foi enviado (não quebra o fluxo do usuário,
   que já recebeu o Lead via Pixel no navegador).
   ========================================================= */

const crypto = require("crypto");
const { isAllowedOrigin } = require("./_lib/security");

const DEFAULT_PIXEL_ID = "1617277909405709";
const GRAPH_API_VERSION = "v21.0";

/* Este endpoint só aceita o campo "Lead" — event_name, pixel_id e
   access_token NUNCA vêm do corpo da requisição (só de constantes
   fixas e de variáveis de ambiente do servidor), então não há como
   o cliente transformar isso num proxy genérico para a Graph API. */

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** Meta espera dígitos com código do país, sem "+". O formulário não
    pede DDI (só DDD + número, padrão de uso no Brasil) — como a
    página, a oferta e o número de WhatsApp da empresa são 100%
    brasileiros, assumimos +55 quando o número informado ainda não
    tem o código do país. */
function normalizePhone(phone) {
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = "55" + digits;
  return digits;
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) return String(forwardedFor).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : null;
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

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;

  if (!accessToken) {
    console.error(
      "[meta-capi] META_CAPI_ACCESS_TOKEN não configurado na Vercel — evento não enviado à Meta."
    );
    res.status(200).json({ ok: false, reason: "missing_access_token" });
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

  const {
    event_id,
    event_time,
    event_source_url,
    origin,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    email,
    phone,
    fbp,
    fbc,
  } = body;

  if (!event_id || !event_source_url) {
    res.status(400).json({ ok: false, reason: "missing_required_fields" });
    return;
  }

  const user_data = {};
  if (email) user_data.em = [sha256(normalizeEmail(email))];
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized) user_data.ph = [sha256(normalized)];
  }
  const clientIp = getClientIp(req);
  const userAgent = req.headers["user-agent"];
  if (clientIp) user_data.client_ip_address = clientIp;
  if (userAgent) user_data.client_user_agent = userAgent;
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;

  const custom_data = {
    content_name: "Diagnostico Gratuito Marcenaria",
    content_category: "Diagnostico",
  };
  if (origin) custom_data.origin = origin;
  if (utm_source) custom_data.utm_source = utm_source;
  if (utm_medium) custom_data.utm_medium = utm_medium;
  if (utm_campaign) custom_data.utm_campaign = utm_campaign;
  if (utm_content) custom_data.utm_content = utm_content;
  if (utm_term) custom_data.utm_term = utm_term;

  const eventTimeSeconds = Number.isFinite(Number(event_time))
    ? Math.floor(Number(event_time))
    : Math.floor(Date.now() / 1000);

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: eventTimeSeconds,
        event_id,
        action_source: "website",
        event_source_url,
        user_data,
        custom_data,
      },
    ],
  };

  try {
    const url =
      "https://graph.facebook.com/" +
      GRAPH_API_VERSION +
      "/" +
      pixelId +
      "/events?access_token=" +
      encodeURIComponent(accessToken);

    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const metaJson = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      console.error("[meta-capi] Meta respondeu com erro:", metaRes.status, metaJson);
      res.status(502).json({ ok: false, reason: "meta_error" });
      return;
    }

    res.status(200).json({ ok: true, event_id });
  } catch (err) {
    console.error("[meta-capi] Falha ao enviar evento para a Meta:", err.message);
    res.status(502).json({ ok: false, reason: "request_failed" });
  }
};
