/* =========================================================
   quiz-engine.js — Quiz real confirmado pelos prints:
   modal de 4 etapas + tela de confirmação (etapa 5).

   Fluxo:
     Etapas 1–3: escolha única, avança automático ao clicar.
     Etapa 4:    formulário de contato (nome/WhatsApp/e-mail)
                 + consentimento LGPD + honeypot → "ENVIAR →".
     Etapa 5:    confirmação centralizada, sem cabeçalho/barra;
                 só o botão "RECEBER MINHA ANÁLISE →" abre o
                 WhatsApp (mensagem = resumo das respostas + nome).

   Não existe pontuação/pilar calculado — a análise é feita
   pela equipe na conversa, não pelo site.

   Eventos (analytics.js):
     quiz_start            ao abrir o modal
     quiz_step_completed   etapas 1–3 no clique, etapa 4 no submit
     lead_submitted        submit válido da etapa 4 (+ Pixel Lead)
     quiz_completed        ao exibir a etapa 5 (+ Pixel CompleteRegistration)
     cta_whatsapp_click    clique em "RECEBER MINHA ANÁLISE →"
   ========================================================= */

import { CONFIG } from "./config.js";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./scoring.js";
import {
  validateContactForm,
  showFormError,
  clearFormError,
} from "./form-validation.js";
import { track, pixelTrack, getStoredUtms } from "./analytics.js";
import { trapFocus } from "./ui.js";

/* Copy aprovada das 3 perguntas (prints reais).
   "rotulo" é usado no resumo da mensagem de WhatsApp. */
const QUESTIONS = [
  {
    id: "q1",
    layout: "grid", // 2 colunas (2x2), como no print
    pergunta: "Quantos funcionários tem sua marcenaria?",
    subtitulo: "Isso ajuda a entender o tamanho da sua operação.",
    rotulo: "Funcionários",
    opcoes: ["Só eu", "1 a 3", "4 a 10", "Mais de 10"],
  },
  {
    id: "q2",
    layout: "lista",
    pergunta: "Qual é o maior desafio hoje?",
    subtitulo: "Escolha a opção que mais representa seu momento.",
    rotulo: "Maior desafio",
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

/* Consentimento LGPD (exigência da seção 11 do briefing — não aparece
   no print, remover só se a cliente pedir explicitamente). */
const CONSENT_TEXT = {
  prefix: "Li e concordo com a ",
  link: "Política de Privacidade",
  suffix:
    " e autorizo o uso dos meus dados para contato sobre o diagnóstico.",
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
  renderQuestion(0);
  track("quiz_start", {
    origin: (trigger && trigger.dataset.origin) || "desconhecido",
  });
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
  answers[current] = { rotulo: q.rotulo, resposta: texto };
  track("quiz_step_completed", { step: current + 1 });
  if (current + 1 < QUESTIONS.length) renderQuestion(current + 1);
  else renderForm();
}

function renderForm() {
  current = 3;
  setHeader(4);
  els.body.textContent = "";

  const consentLinkHtml = CONFIG.privacyPolicyUrl
    ? '<a href="' +
      CONFIG.privacyPolicyUrl +
      '" target="_blank" rel="noopener noreferrer">' +
      CONSENT_TEXT.link +
      "</a>"
    : CONSENT_TEXT.link;

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
    '<label class="quiz-consent">' +
    '<input type="checkbox" id="quiz-consent" name="consent">' +
    "<span>" +
    CONSENT_TEXT.prefix +
    consentLinkHtml +
    CONSENT_TEXT.suffix +
    "</span>" +
    "</label>" +
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
    /* Lead capturado: dois eventos AGORA; o clique de WhatsApp é outro
       momento (etapa 5) e outra métrica — não disparar juntos. */
    track("quiz_step_completed", { step: 4 });
    track("lead_submitted");
    pixelTrack("Lead");
    renderConfirmation();
  });

  els.body.appendChild(form);
  focusTitle(form.querySelector("h3"));
}

function renderConfirmation() {
  current = 4;
  hideHeader();
  track("quiz_completed");
  pixelTrack("CompleteRegistration");
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
    track("cta_whatsapp_click", { origin: "quiz" });
    window.open(url, "_blank", "noopener");
  });

  els.body.appendChild(box);
  focusTitle(box.querySelector(".quiz-confirm__title"));
}
