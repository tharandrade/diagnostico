/* =========================================================
   quiz-engine.js — Perguntas, navegação e passo final do quiz.

   ⚠️⚠️ CONTEÚDO PLACEHOLDER — [A CONFIRMAR COM A CLIENTE] ⚠️⚠️
   As perguntas reais ainda não foram enviadas. NÃO publicar
   com estes textos. Quando o conteúdo chegar, basta trocar o
   array QUESTIONS abaixo — HTML e CSS não mudam.

   Shape de cada pergunta:
     id:      identificador único
     pilar:   "comercial" | "producao" | "montagem" | "financeiro"
     pergunta: texto da pergunta
     opcoes:  [{ texto, pontos }]  → pontos baixos = situação pior
   ========================================================= */

import { CONFIG } from "./config.js";
import {
  computeScores,
  weakestPillar,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from "./scoring.js";
import {
  validateFinalForm,
  showFormError,
  clearFormError,
} from "./form-validation.js";
import { track, pixelTrack, getStoredUtms } from "./analytics.js";
import { trapFocus } from "./ui.js";

export const QUESTIONS = [
  {
    id: "com01",
    pilar: "comercial",
    pergunta: "[A CONFIRMAR] Pergunta 1 sobre o Comercial — texto real será enviado pela cliente",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "com02",
    pilar: "comercial",
    pergunta: "[A CONFIRMAR] Pergunta 2 sobre o Comercial",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "pro01",
    pilar: "producao",
    pergunta: "[A CONFIRMAR] Pergunta 1 sobre a Produção",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "pro02",
    pilar: "producao",
    pergunta: "[A CONFIRMAR] Pergunta 2 sobre a Produção",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "mon01",
    pilar: "montagem",
    pergunta: "[A CONFIRMAR] Pergunta 1 sobre a Montagem",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "mon02",
    pilar: "montagem",
    pergunta: "[A CONFIRMAR] Pergunta 2 sobre a Montagem",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "fin01",
    pilar: "financeiro",
    pergunta: "[A CONFIRMAR] Pergunta 1 sobre Administrativo e Financeiro",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
  {
    id: "fin02",
    pilar: "financeiro",
    pergunta: "[A CONFIRMAR] Pergunta 2 sobre Administrativo e Financeiro",
    opcoes: [
      { texto: "[A CONFIRMAR] Opção que indica situação crítica", pontos: 1 },
      { texto: "[A CONFIRMAR] Opção que indica situação intermediária", pontos: 2 },
      { texto: "[A CONFIRMAR] Opção que indica situação estruturada", pontos: 3 },
    ],
  },
];

/* Textos de interface do quiz (não são copy de marketing — ajustar com a
   cliente junto com as perguntas, se ela quiser). */
const UI_TEXT = {
  back: "← Voltar",
  progressDone: "Diagnóstico concluído",
  finalTitle: "Diagnóstico concluído!",
  finalText:
    "Toque no botão abaixo para abrir a conversa no WhatsApp — suas respostas serão o ponto de partida.",
  consentPrefix: "Li e concordo com a ",
  consentLink: "Política de Privacidade",
  consentSuffix:
    " e autorizo o uso das minhas respostas para iniciar a conversa no WhatsApp.",
  submit: "ABRIR CONVERSA NO WHATSAPP",
};

let current = 0;
let answers = [];
let opener = null;
const els = {};

export function initQuiz() {
  els.root = document.getElementById("quiz");
  els.body = document.getElementById("quiz-body");
  els.fill = document.getElementById("quiz-bar-fill");
  els.progress = document.getElementById("quiz-progress-text");
  els.close = document.getElementById("quiz-close");
  if (!els.root) return;

  els.close.addEventListener("click", closeQuiz);
  els.root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuiz();
    else if (e.key === "Tab") trapFocus(els.root, e);
  });
}

export function openQuiz(trigger) {
  opener = trigger || null;
  current = 0;
  answers = [];
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

function setProgress(index, total) {
  els.fill.style.width = Math.round((index / total) * 100) + "%";
  els.progress.textContent = "Pergunta " + (index + 1) + " de " + total;
}

function setProgressDone() {
  els.fill.style.width = "100%";
  els.progress.textContent = UI_TEXT.progressDone;
}

function renderQuestion(index) {
  current = index;
  const q = QUESTIONS[index];
  setProgress(index, QUESTIONS.length);
  els.body.textContent = "";

  const wrap = document.createElement("fieldset");
  wrap.className = "quiz-q";

  const legend = document.createElement("legend");
  legend.className = "quiz-q__text";
  legend.tabIndex = -1;
  legend.textContent = q.pergunta;
  wrap.appendChild(legend);

  const optsBox = document.createElement("div");
  optsBox.className = "quiz-q__options";
  q.opcoes.forEach((op) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.textContent = op.texto;
    btn.addEventListener("click", () => selectOption(op));
    optsBox.appendChild(btn);
  });
  wrap.appendChild(optsBox);
  els.body.appendChild(wrap);

  if (index > 0) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "quiz__back";
    back.textContent = UI_TEXT.back;
    back.addEventListener("click", () => renderQuestion(index - 1));
    els.body.appendChild(back);
  }

  els.root.scrollTop = 0;
  legend.focus();
}

function selectOption(opcao) {
  const q = QUESTIONS[current];
  answers[current] = { pilar: q.pilar, pontos: opcao.pontos };
  track("quiz_step_completed", { step: current + 1, pilar: q.pilar });
  if (current + 1 < QUESTIONS.length) {
    renderQuestion(current + 1);
  } else {
    renderFinal();
  }
}

function renderFinal() {
  setProgressDone();
  track("quiz_completed");
  pixelTrack("CompleteRegistration");
  els.body.textContent = "";

  const consentLinkHtml = CONFIG.privacyPolicyUrl
    ? '<a href="' +
      CONFIG.privacyPolicyUrl +
      '" target="_blank" rel="noopener">' +
      UI_TEXT.consentLink +
      "</a>"
    : UI_TEXT.consentLink;

  const form = document.createElement("form");
  form.className = "quiz-final";
  form.noValidate = true;
  form.innerHTML =
    '<p class="quiz-final__badge" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    "</p>" +
    '<h3 class="quiz-final__title" tabindex="-1">' +
    UI_TEXT.finalTitle +
    "</h3>" +
    "<p>" +
    UI_TEXT.finalText +
    "</p>" +
    '<div class="hp-field" aria-hidden="true">' +
    '<label>Não preencha este campo<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
    "</div>" +
    '<label class="quiz-consent">' +
    '<input type="checkbox" id="quiz-consent" name="consent">' +
    "<span>" +
    UI_TEXT.consentPrefix +
    consentLinkHtml +
    UI_TEXT.consentSuffix +
    "</span>" +
    "</label>" +
    '<p class="quiz-final__error" role="alert" hidden></p>' +
    '<button type="submit" class="btn">' +
    UI_TEXT.submit +
    ' <span class="btn__arrow" aria-hidden="true">→</span></button>';

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormError(form);
    const result = validateFinalForm(form);
    if (!result.ok) {
      if (!result.silent) showFormError(form, result.message);
      return;
    }
    const scores = computeScores(answers);
    const pilar = weakestPillar(scores);
    const msg = buildWhatsAppMessage(pilar, getStoredUtms());
    const url = buildWhatsAppUrl(CONFIG.whatsappNumber, msg);
    track("lead_submitted", { pilar });
    pixelTrack("Lead");
    track("cta_whatsapp_click", { origin: "quiz", pilar });
    window.open(url, "_blank", "noopener");
  });

  els.body.appendChild(form);
  els.root.scrollTop = 0;
  form.querySelector(".quiz-final__title").focus();
}
