/* =========================================================
   analytics.js — Camada central de tracking (Meta Pixel + CAPI
   + dataLayer). Toda chamada a fbq/dataLayer do projeto passa
   por aqui — nenhum outro arquivo chama fbq() diretamente.

   Meta Pixel instalado: 1617277909405709 (implementação oficial:
   stub síncrono + fbq('init')/PageView enfileirados; o script real
   fbevents.js é solicitado com <script async> IMEDIATAMENTE — não
   espera `load`/idle. Decisão deliberada: confiabilidade de
   atribuição em tráfego pago (criação do cookie _fbp o mais cedo
   possível) pesa mais aqui do que a alguns ms a menos de LCP; como
   o script é `async`, ele não bloqueia parsing/renderização mesmo
   começando a baixar cedo. GTM/GA4 continuam deferidos — não estão
   instalados ainda e isso não foi pedido.

   Eventos Meta (Standard em fbq('track'), Custom em
   fbq('trackCustom') — necessário para aparecerem corretos no
   Gerenciador de Eventos):
     PageView          — standard, uma vez por carregamento real
     DiagnosticStart    — custom, 1x por visita (1º CTA que abre o quiz)
     DiagnosticStep     — custom, no máximo 1x por etapa/visita
     Lead               — standard, 1x por envio bem-sucedido (com eventID)
     VideoStart / VideoProgress25/50/75 / VideoComplete — custom
     WhatsAppClick       — custom, por clique real

   Os mesmos eventos (exceto PageView, que já tem seu próprio
   `page_view`) alimentam window.dataLayer com os nomes:
     diagnostic_start, diagnostic_step, lead, video_start,
     video_progress_25/50/75, video_complete, whatsapp_click

   ATENÇÃO: não há GTM/GA4 instalados ainda (IDs vazios) — os
   pushes de dataLayer ficam prontos para quando entrarem.
   ========================================================= */

export const ANALYTICS_IDS = {
  GTM_ID: "", // pendente — ex.: "GTM-XXXXXXX"
  META_PIXEL_ID: "1617277909405709", // Pixel oficial da cliente
  GA4_ID: "", // pendente — desnecessário se o GA4 já estiver dentro do GTM
};

/* Mude para true apenas durante testes locais para ver os eventos
   no console (formato "[Analytics] Evento — detalhe"). Deixe
   sempre false antes de publicar — não deixamos log em produção. */
const ANALYTICS_DEBUG = false;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
];
const STORAGE_KEY = "yuka_utms";

/* ---------- estado do funil (em memória — dura enquanto a aba
   está aberta; uma nova visita/reload começa do zero, o que é o
   comportamento pedido para "1x por visita") ---------- */
let diagnosticStartFired = false;
let diagnosticOrigin = null; /* origem do 1º CTA que abriu o diagnóstico — não é sobrescrita depois */
let lastCtaOrigin = null; /* último CTA clicado, só para análise extra */
const firedSteps = new Set();
let leadFired = false;
let videoStarted = false;
const videoMilestones = new Set();
let videoCompleted = false;

export function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  captureUtms();
  captureFbc();
  initMetaPixel();
  if (document.readyState === "complete") {
    scheduleLoaders();
  } else {
    window.addEventListener("load", scheduleLoaders, { once: true });
  }
}

/* =========================================================
   PIXEL — stub oficial + init/PageView (enfileirados) + o script
   real fbevents.js pedido como <script async> imediatamente (ver
   loadMetaPixelScript(), chamada no fim de initMetaPixel()) — não
   espera window.load/requestIdleCallback, para o cookie _fbp ser
   criado o mais cedo possível em tráfego pago.
   ========================================================= */

let pixelInitialized = false;

function ensurePixelStub() {
  if (window.fbq) return;
  const n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
}

function initMetaPixel() {
  const id = ANALYTICS_IDS.META_PIXEL_ID;
  if (!id || pixelInitialized) return;
  pixelInitialized = true;
  ensurePixelStub();
  window.fbq("init", id);
  pixelStandard("PageView");
  pushDataLayer("page_view", { page_path: window.location.pathname });
  debugLog("PageView");
  loadMetaPixelScript();
}

let pixelScriptRequested = false;
/** <script async>: baixa em paralelo ao parsing, executa sem
    bloquear renderização — mas começa AGORA, não depois do load. */
function loadMetaPixelScript() {
  if (!ANALYTICS_IDS.META_PIXEL_ID || pixelScriptRequested) return;
  pixelScriptRequested = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
}

/** Standard event (PageView, Lead, ...) — usa fbq('track', ...). */
function pixelStandard(eventName, params = {}, eventId) {
  if (typeof window.fbq !== "function") return;
  if (eventId) window.fbq("track", eventName, params, { eventID: eventId });
  else window.fbq("track", eventName, params);
}

/** Custom event (DiagnosticStart, VideoStart, ...) — usa fbq('trackCustom', ...)
    para aparecer corretamente no Gerenciador de Eventos da Meta. */
function pixelCustom(eventName, params = {}, eventId) {
  if (typeof window.fbq !== "function") return;
  if (eventId) window.fbq("trackCustom", eventName, params, { eventID: eventId });
  else window.fbq("trackCustom", eventName, params);
}

function pushDataLayer(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

function debugLog(label, data) {
  if (!ANALYTICS_DEBUG) return;
  if (data !== undefined) console.log("[Analytics] " + label, data);
  else console.log("[Analytics] " + label);
}

/* =========================================================
   UTMs, _fbp, _fbc — atribuição capturada na chegada e mantida
   durante toda a sessão da aba (sessionStorage para UTMs; _fbp é
   cookie próprio da Meta; _fbc é cookie que criamos só quando
   falta e existe fbclid, no formato oficial da CAPI).
   ========================================================= */

function captureUtms() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = v;
    });
    if (Object.keys(found).length) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch (e) {
    /* sessionStorage indisponível: segue sem UTM */
  }
}

/** UTMs capturados na chegada (persistem na aba via sessionStorage). */
export function getStoredUtms() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(
      new RegExp("(?:^|; )" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    return null;
  }
}

function setCookie(name, value, days) {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie =
      name + "=" + encodeURIComponent(value) + "; max-age=" + maxAge + "; path=/; SameSite=Lax";
  } catch (e) {
    /* cookies indisponíveis: segue sem persistir */
  }
}

function getFbp() {
  return getCookie("_fbp");
}

/** _fbc: se o cookie da Meta ainda não existe mas há fbclid na URL
    (ou já guardado nas UTMs desta sessão), criamos no formato oficial
    fb.1.<timestamp>.<fbclid> — mesmo formato que o próprio pixel usaria. */
function captureFbc() {
  try {
    if (getCookie("_fbc")) return;
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid") || getStoredUtms().fbclid;
    if (!fbclid) return;
    setCookie("_fbc", "fb.1." + Date.now() + "." + fbclid, 90);
  } catch (e) {
    /* segue sem _fbc */
  }
}

function getFbc() {
  captureFbc();
  return getCookie("_fbc");
}

function buildAttributionParams() {
  const utms = getStoredUtms();
  const params = { page_path: window.location.pathname };
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
    (k) => {
      if (utms[k]) params[k] = utms[k];
    }
  );
  return params;
}

/* =========================================================
   FUNIL DO DIAGNÓSTICO
   ========================================================= */

/**
 * Chamar quando o usuário efetivamente ABRIR o diagnóstico (modal
 * do quiz visível). Dispara DiagnosticStart só na primeira vez da
 * visita — reabrir o modal depois não duplica.
 */
export function trackDiagnosticStart(origin) {
  const resolvedOrigin = origin || "desconhecido";
  lastCtaOrigin = resolvedOrigin;
  if (diagnosticStartFired) return;
  diagnosticStartFired = true;
  diagnosticOrigin = resolvedOrigin;

  const params = { origin: diagnosticOrigin, ...buildAttributionParams() };
  pixelCustom("DiagnosticStart", params);
  pushDataLayer("diagnostic_start", params);
  debugLog("DiagnosticStart — origin: " + diagnosticOrigin);
}

/**
 * Chamar quando uma etapa for efetivamente EXIBIDA ao usuário
 * (não quando ela é respondida). Dispara no máximo uma vez por
 * número de etapa durante a visita — mede o ponto máximo de
 * progressão, não repete se o usuário voltar/avançar de novo.
 */
export function trackDiagnosticStep(stepNumber, totalSteps, stepName) {
  if (firedSteps.has(stepNumber)) return;
  firedSteps.add(stepNumber);

  const params = {
    step_number: stepNumber,
    total_steps: totalSteps,
    origin: diagnosticOrigin || "desconhecido",
    ...buildAttributionParams(),
  };
  if (stepName) params.step_name = stepName;

  pixelCustom("DiagnosticStep", params);
  pushDataLayer("diagnostic_step", params);
  debugLog("DiagnosticStep — " + stepNumber + "/" + totalSteps + (stepName ? " (" + stepName + ")" : ""));
}

function generateEventId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix + "_" + Date.now() + "_" + rand;
}

/**
 * Chamar SOMENTE no sucesso real do envio do formulário (depois da
 * validação passar). Gera um event_id único, dispara o Standard
 * Event Lead no Pixel do navegador com esse eventID, envia o mesmo
 * evento ao dataLayer e dispara (best-effort, sem bloquear a UI) a
 * Conversions API com o MESMO event_id, para a Meta deduplicar.
 * Protegido contra disparo duplicado: só produz um Lead por sessão
 * do formulário mesmo se o callback de sucesso rodar mais de uma vez.
 */
export function trackLead({ email, phone } = {}) {
  if (leadFired) return null;
  leadFired = true;

  const eventId = generateEventId("lead");
  const origin = diagnosticOrigin || "desconhecido";
  const attribution = buildAttributionParams();

  const pixelParams = {
    content_name: "Diagnostico Gratuito Marcenaria",
    content_category: "Diagnostico",
    origin,
    ...attribution,
  };
  pixelStandard("Lead", pixelParams, eventId);

  const dlParams = { ...pixelParams, event_id: eventId };
  if (lastCtaOrigin && lastCtaOrigin !== origin) dlParams.last_origin = lastCtaOrigin;
  pushDataLayer("lead", dlParams);
  debugLog("Lead — event_id: " + eventId, { origin, ...attribution });

  sendLeadToCapi({ eventId, origin, attribution, email, phone });

  return eventId;
}

/** Envio best-effort do Lead para /api/meta-capi (server-side, com o
    MESMO event_id do Pixel) — só é chamado depois que o Make.com já
    confirmou o recebimento do lead (ver quiz-engine.js), então uma
    falha aqui é só da CAPI: nunca desfaz o sucesso do formulário nem
    é mostrada ao usuário, que já está vendo a tela de confirmação. */
function sendLeadToCapi({ eventId, origin, attribution, email, phone }) {
  try {
    const payload = {
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      origin,
      ...attribution,
      fbp: getFbp() || undefined,
      fbc: getFbc() || undefined,
    };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;

    fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((r) => debugLog("CAPI Lead enviado — status " + r.status))
      .catch((err) => debugLog("CAPI Lead falhou (não afeta o usuário): " + err.message));
  } catch (e) {
    debugLog("CAPI Lead — erro ao montar payload: " + e.message);
  }
}

/* =========================================================
   VSL (YouTube IFrame Player API — ver ui.js)
   ========================================================= */

export function trackVideoStart(videoId, videoTitle) {
  if (videoStarted) return;
  videoStarted = true;
  const params = { video_id: videoId, video_title: videoTitle, video_percent: 0 };
  pixelCustom("VideoStart", params);
  pushDataLayer("video_start", params);
  debugLog("VideoStart");
}

const PROGRESS_EVENTS = {
  25: { meta: "VideoProgress25", dl: "video_progress_25" },
  50: { meta: "VideoProgress50", dl: "video_progress_50" },
  75: { meta: "VideoProgress75", dl: "video_progress_75" },
};

/** Dispara os marcos de 25/50/75% ainda não registrados nesta
    reprodução. Percorre em ordem crescente para o caso de o usuário
    pular trechos (ex.: arrastar a barra) — cada marco só uma vez. */
export function trackVideoProgress(percent, videoId, videoTitle) {
  [25, 50, 75].forEach((milestone) => {
    if (percent < milestone || videoMilestones.has(milestone)) return;
    videoMilestones.add(milestone);
    const def = PROGRESS_EVENTS[milestone];
    const params = { video_id: videoId, video_title: videoTitle, video_percent: milestone };
    pixelCustom(def.meta, params);
    pushDataLayer(def.dl, params);
    debugLog("VideoProgress" + milestone);
  });
}

export function trackVideoComplete(videoId, videoTitle) {
  if (videoCompleted) return;
  videoCompleted = true;
  const params = { video_id: videoId, video_title: videoTitle, video_percent: 100 };
  pixelCustom("VideoComplete", params);
  pushDataLayer("video_complete", params);
  debugLog("VideoComplete");
}

/* =========================================================
   WHATSAPP
   ========================================================= */

/**
 * Chamar no clique real de qualquer link de WhatsApp da página.
 * `placement` identifica qual botão foi clicado (o flutuante é
 * obrigatoriamente "floating_button"). Nunca dispara Lead — é uma
 * métrica separada de contato direto.
 */
export function trackWhatsAppClick(placement) {
  const attribution = buildAttributionParams();
  const utms = getStoredUtms();
  const params = {
    placement,
    diagnostic_started: diagnosticStartFired,
    ...attribution,
  };
  if (utms.fbclid) params.fbclid = utms.fbclid;

  pixelCustom("WhatsAppClick", params);
  pushDataLayer("whatsapp_click", params);
  debugLog("WhatsAppClick — " + placement);
}

/* =========================================================
   GTM / GA4 — sem ID ainda (instalação futura); scripts só
   carregam depois do load + idle, nunca competem com o LCP. O
   Pixel NÃO passa mais por aqui — ver loadMetaPixelScript(),
   chamado imediatamente em initMetaPixel().
   ========================================================= */

function scheduleLoaders() {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(() => {
    loadGTM();
    loadGA4();
  });
}

function loadGTM() {
  const id = ANALYTICS_IDS.GTM_ID;
  if (!id) return;
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtm.js?id=" + id;
  document.head.appendChild(s);
}

function loadGA4() {
  const id = ANALYTICS_IDS.GA4_ID;
  if (!id) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
  document.head.appendChild(s);
  window.gtag =
    window.gtag ||
    function () {
      (window.dataLayer = window.dataLayer || []).push(arguments);
    };
  window.gtag("js", new Date());
  window.gtag("config", id);
}
