/* =========================================================
   quiz-engine.js — Quiz real confirmado pelos prints:
   modal de 4 etapas + tela de confirmação (etapa 5).

   Fluxo:
     Etapas 1–3: escolha única, avança automático ao clicar.
     Etapa 4:    formulário nome/WhatsApp/e-mail + honeypot
                 (SEM checkbox LGPD — decisão da cliente, idêntico
                 ao print). No submit válido: o lead é enviado a
                 /api/submit-lead (repassa ao Make.com server-side
                 e aguarda confirmação real). Só quando o servidor
                 confirma sucesso é que a etapa 5 aparece e o
                 tracking de Lead dispara — em falha, o formulário
                 mostra erro e mantém os dados preenchidos.
     Etapa 5:    confirmação centralizada, sem cabeçalho/barra;
                 só o botão "RECEBER MINHA ANÁLISE →" abre o
                 WhatsApp (resumo das respostas + nome — e-mail e
                 telefone vão só pro Make.com, não pro texto).

   Não existe pontuação/pilar calculado — a análise é feita
   pela equipe na conversa, não pelo site.

   Eventos (analytics.js — camada central de tracking):
     DiagnosticStart   1x por visita, na 1ª abertura real do modal
     DiagnosticStep    ao EXIBIR cada etapa (1–4), no máx. 1x por etapa
     Lead              no sucesso real do submit da etapa 4 (com event_id
                        replicado na Conversions API — ver analytics.js)
     WhatsAppClick     clique em "RECEBER MINHA ANÁLISE →" (placement
                        "quiz_confirmation") — não é Lead, é outra métrica
   ========================================================= */

import { CONFIG } from "./config.js";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./scoring.js";
import {
  validateContactForm,
  showFormError,
  clearFormError,
} from "./form-validation.js";
import {
  getStoredUtms,
  trackDiagnosticStart,
  trackDiagnosticStep,
  trackLead,
  trackWhatsAppClick,
} from "./analytics.js";
import { trapFocus } from "./ui.js";

/* Copy aprovada das 3 perguntas (prints reais).
   "rotulo" é usado no resumo da mensagem de WhatsApp;
   "campo" é o nome do campo no payload do webhook do Make.com. */
const QUESTIONS = [
  {
    id: "q1",
    layout: "grid", // 2 colunas (2x2), como no print
    pergunta: "Quantos funcionários tem sua marcenaria?",
    subtitulo: "Isso ajuda a entender o tamanho da sua operação.",
    rotulo: "Funcionários",
    campo: "funcionarios",
    opcoes: ["Só eu", "1 a 3", "4 a 10", "Mais de 10"],
  },
  {
    id: "q2",
    layout: "lista",
    pergunta: "Qual é o maior desafio hoje?",
    subtitulo: "Escolha a opção que mais representa seu momento.",
    rotulo: "Maior desafio",
    campo: "maior_desafio",
    opcoes: [
      "Vendo, mas o dinheiro não sobra",
      "Não sei se meus projetos dão lucro",
      "Meus prazos vivem atrasando",
      "Tenho dificuldade com equipe e produção",
      "Quero vender mais e fechar melhor",
      "Tudo depende de mim",
    ],
  },
  {
    id: "q3",
    layout: "lista",
    pergunta: "Hoje você já tem projetos entrando todos os meses?",
    subtitulo: "Como está sua demanda atualmente?",
    rotulo: "Demanda",
    campo: "demanda",
    opcoes: [
      "Sim, tenho demanda recorrente",
      "Varia bastante",
      "Estou com pouca demanda",
      "Ainda estou começando",
    ],
  },
];

const TOTAL_ETAPAS = 4;

/* Copy aprovada da etapa 4 (formulário) e da etapa 5 (confirmação). */
const FORM_TEXT = {
  titulo: "Quase lá, é só isso",
  subtitulo: "Preencha seus dados para receber sua análise pelo WhatsApp.",
  labels: { nome: "Nome completo", whatsapp: "WhatsApp", email: "E-mail" },
  placeholders: {
    nome: "Seu nome completo",
    whatsapp: "(00) 00000-0000",
    email: "seu@email.com",
  },
  botao: "ENVIAR",
  micro:
    "Sem spam. Suas respostas serão usadas para uma conversa real sobre sua marcenaria.",
};

const CONFIRM_TEXT = {
  titulo: "Diagnóstico recebido ✅",
  p1: "Agora vou analisar suas respostas para identificar possíveis falhas de precificação, gargalos de produção e oportunidades de aumento de lucro na sua marcenaria.",
  p2: "Clique no botão abaixo para receber sua análise pelo WhatsApp.",
  botao: "RECEBER MINHA ANÁLISE",
};

/* Estado: 0–2 = perguntas, 3 = formulário, 4 = confirmação */
let current = 0;
let answers = [];
let leadNome = "";
let opener = null;
const els = {};

export function initQuiz() {
  els.root = document.getElementById("quiz");
  els.body = document.getElementById("quiz-body");
  els.stepLabel = document.getElementById("quiz-step-label");
  els.meta = document.getElementById("quiz-meta");
  els.segments = els.meta
    ? els.meta.querySelectorAll(".quiz__segments span")
    : [];
  els.back = document.getElementById("quiz-back");
  els.close = document.getElementById("quiz-close");
  if (!els.root) return;

  els.close.addEventListener("click", closeQuiz);
  els.back.addEventListener("click", goBack);
  els.root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuiz();
    else if (e.key === "Tab") trapFocus(els.root, e);
  });
}

export function openQuiz(trigger) {
  opener = trigger || null;
  current = 0;
  answers = [];
  leadNome = "";
  els.root.hidden = false;
  document.body.classList.add("no-scroll");
  trackDiagnosticStart(trigger && trigger.dataset.origin);
  renderQuestion(0);
}

export function closeQuiz() {
  els.root.hidden = true;
  document.body.classList.remove("no-scroll");
  if (opener && typeof opener.focus === "function") opener.focus();
}

/* ---------- interno ---------- */

function goBack() {
  if (current >= 1 && current <= 2) renderQuestion(current - 1);
  else if (current === 3) renderQuestion(QUESTIONS.length - 1);
}

/** Cabeçalho: "Etapa X de 4", "← Voltar" (a partir da etapa 2),
    barra de 4 segmentos com preenchimento cumulativo. */
function setHeader(etapa) {
  els.stepLabel.hidden = false;
  els.meta.hidden = false;
  els.stepLabel.textContent = "Etapa " + etapa + " de " + TOTAL_ETAPAS;
  els.back.hidden = etapa === 1;
  els.segments.forEach((seg, i) => {
    seg.classList.toggle("is-done", i < etapa);
  });
}

/** Etapa 5: sem "Etapa X de 4", sem barra, sem Voltar — só o X. */
function hideHeader() {
  els.stepLabel.hidden = true;
  els.meta.hidden = true;
  els.back.hidden = true;
}

function focusTitle(el) {
  els.root.scrollTop = 0;
  el.focus();
}

function renderQuestion(index) {
  current = index;
  const q = QUESTIONS[index];
  setHeader(index + 1);
  trackDiagnosticStep(index + 1, TOTAL_ETAPAS, q.campo);
  els.body.textContent = "";

  const wrap = document.createElement("fieldset");
  wrap.className = "quiz-q";

  const legend = document.createElement("legend");
  legend.className = "quiz-q__text";
  legend.tabIndex = -1;
  legend.textContent = q.pergunta;
  wrap.appendChild(legend);

  const sub = document.createElement("p");
  sub.className = "quiz-q__sub";
  sub.textContent = q.subtitulo;
  wrap.appendChild(sub);

  const optsBox = document.createElement("div");
  optsBox.className =
    "quiz-options" + (q.layout === "grid" ? " quiz-options--grid" : "");
  q.opcoes.forEach((texto) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.textContent = texto;
    /* escolha única: clicar já avança para a próxima etapa */
    btn.addEventListener("click", () => selectOption(texto));
    optsBox.appendChild(btn);
  });
  wrap.appendChild(optsBox);
  els.body.appendChild(wrap);

  focusTitle(legend);
}

function selectOption(texto) {
  const q = QUESTIONS[current];
  answers[current] = { campo: q.campo, rotulo: q.rotulo, resposta: texto };
  if (current + 1 < QUESTIONS.length) renderQuestion(current + 1);
  else renderForm();
}

function renderForm() {
  current = 3;
  setHeader(4);
  trackDiagnosticStep(4, TOTAL_ETAPAS, "contato");
  els.body.textContent = "";

  const form = document.createElement("form");
  form.className = "quiz-form";
  form.noValidate = true;
  form.innerHTML =
    '<h3 class="quiz-q__text" tabindex="-1">' +
    FORM_TEXT.titulo +
    "</h3>" +
    '<p class="quiz-q__sub">' +
    FORM_TEXT.subtitulo +
    "</p>" +
    '<div class="quiz-form__field">' +
    '<label for="lead-nome">' +
    FORM_TEXT.labels.nome +
    "</label>" +
    '<input type="text" id="lead-nome" name="nome" autocomplete="name" placeholder="' +
    FORM_TEXT.placeholders.nome +
    '">' +
    "</div>" +
    '<div class="quiz-form__field">' +
    '<label for="lead-whatsapp">' +
    FORM_TEXT.labels.whatsapp +
    "</label>" +
    '<input type="tel" id="lead-whatsapp" name="whatsapp" autocomplete="tel" inputmode="tel" placeholder="' +
    FORM_TEXT.placeholders.whatsapp +
    '">' +
    "</div>" +
    '<div class="quiz-form__field">' +
    '<label for="lead-email">' +
    FORM_TEXT.labels.email +
    "</label>" +
    '<input type="email" id="lead-email" name="email" autocomplete="email" inputmode="email" placeholder="' +
    FORM_TEXT.placeholders.email +
    '">' +
    "</div>" +
    '<div class="hp-field" aria-hidden="true">' +
    '<label>Não preencha este campo<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
    "</div>" +
    '<p class="quiz-error" role="alert" hidden></p>' +
    '<button type="submit" class="btn">' +
    FORM_TEXT.botao +
    ' <span class="btn__arrow" aria-hidden="true">→</span></button>' +
    '<p class="quiz-form__micro">' +
    FORM_TEXT.micro +
    "</p>";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormError(form);
    const result = validateContactForm(form);
    if (!result.ok) {
      if (!result.silent) showFormError(form, result.message, result.field);
      return;
    }
    leadNome = form.querySelector("#lead-nome").value.trim();
    const leadWhatsapp = form.querySelector("#lead-whatsapp").value.trim();
    const leadEmail = form.querySelector("#lead-email").value.trim();

    /* Validação client-side aprovada NÃO é sucesso — só sabemos que os
       dados chegaram de verdade quando o servidor confirma que o Make
       aceitou o lead. Desabilita o botão para não permitir reenvio
       duplicado enquanto aguarda; texto do botão não muda. */
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    submitLeadToServer({
      nome: leadNome,
      whatsapp: leadWhatsapp,
      email: leadEmail,
    }).then((delivered) => {
      if (!delivered) {
        submitBtn.disabled = false;
        showFormError(
          form,
          "Não foi possível enviar seus dados agora. Tente novamente em instantes.",
          null
        );
        return;
      }
      /* Sucesso real confirmado pelo servidor: só agora a conversão é
         válida — Pixel Lead (com event_id) + CAPI (mesmo event_id, ver
         analytics.js) e a transição para a etapa 5. */
      trackLead({ email: leadEmail, phone: leadWhatsapp });
      renderConfirmation();
    });
  });

  els.body.appendChild(form);
  focusTitle(form.querySelector("h3"));
}

/**
 * Envia o lead para /api/submit-lead, que repassa server-side ao
 * webhook do Make.com e só responde sucesso depois de uma confirmação
 * HTTP real do Make (ver api/submit-lead.js — nunca finge sucesso).
 * Resolve `true` só nesse caso; `false` em qualquer falha (payload
 * rejeitado, Make indisponível/timeout, rede do navegador etc.) —
 * é esse booleano que decide se o formulário foi enviado com sucesso.
 */
function submitLeadToServer(contato) {
  const utms = getStoredUtms();
  const respostas = {};
  answers.forEach((a) => {
    respostas[a.campo] = a.resposta;
  });
  const body = JSON.stringify({
    nome: contato.nome,
    whatsapp: contato.whatsapp,
    email: contato.email,
    respostas,
    utm_source: utms.utm_source || null,
    utm_medium: utms.utm_medium || null,
    utm_campaign: utms.utm_campaign || null,
    pagina_origem: window.location.href,
    timestamp: new Date().toISOString(),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  return fetch("/api/submit-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: controller.signal,
  })
    .then((res) => res.json().catch(() => ({ ok: false })))
    .then((data) => !!data.ok)
    .catch((err) => {
      console.warn("Falha ao enviar lead:", err);
      return false;
    })
    .finally(() => clearTimeout(timeoutId));
}

function renderConfirmation() {
  current = 4;
  hideHeader();
  els.body.textContent = "";

  const box = document.createElement("div");
  box.className = "quiz-confirm";
  box.innerHTML =
    '<h3 class="quiz-confirm__title" tabindex="-1">' +
    CONFIRM_TEXT.titulo +
    "</h3>" +
    "<p>" +
    CONFIRM_TEXT.p1 +
    "</p>" +
    "<p>" +
    CONFIRM_TEXT.p2 +
    "</p>" +
    '<button type="button" class="btn quiz-confirm__cta">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chat"/></svg> ' +
    CONFIRM_TEXT.botao +
    ' <span class="btn__arrow" aria-hidden="true">→</span></button>';

  box.querySelector(".quiz-confirm__cta").addEventListener("click", () => {
    const msg = buildWhatsAppMessage(
      { nome: leadNome, respostas: answers },
      getStoredUtms()
    );
    const url = buildWhatsAppUrl(CONFIG.whatsappNumber, msg);
    trackWhatsAppClick("quiz_confirmation");
    window.open(url, "_blank", "noopener");
  });

  els.body.appendChild(box);
  focusTitle(box.querySelector(".quiz-confirm__title"));
}
