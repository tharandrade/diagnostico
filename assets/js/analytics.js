/* =========================================================
   analytics.js — GTM / Meta Pixel / GA4 + captura de UTM.

   SLOTS: preencha os IDs abaixo quando a cliente enviar.
   Com os IDs vazios, nenhum script de terceiros é carregado
   e o site funciona 100% (os eventos vão só para o dataLayer).

   Performance: os scripts só carregam DEPOIS do evento load,
   em requestIdleCallback — nunca competem com o LCP.

   Eventos disparados pelo site (GA4/GTM via dataLayer — inertes
   até o GTM ser instalado):
     quiz_start            { origin }
     quiz_step_completed   { step }
     quiz_completed        {}
     lead_submitted        {}
     cta_whatsapp_click    { origin }
   Meta Pixel: só a instalação base (PageView automático) nesta
   etapa — eventos custom atrás da flag PIXEL_CUSTOM_EVENTS.
   ========================================================= */

export const ANALYTICS_IDS = {
  GTM_ID: "", // pendente — ex.: "GTM-XXXXXXX"
  META_PIXEL_ID: "1617277909405709", // instalação BASE autorizada (PageView automático)
  GA4_ID: "", // pendente — desnecessário se o GA4 já estiver dentro do GTM
};

/* ⚠️ SEGURANÇA: o access token do Graph API que veio junto com o Pixel
   NÃO entra neste projeto. Token é credencial server-side (Conversions
   API); num site estático ele ficaria visível para qualquer visitante
   no código-fonte. Conversions API exige um servidor/function guardando
   o token como variável de ambiente.

   Etapa atual do tracking (instrução explícita da cliente):
   - Meta Pixel: SÓ o código base (PageView automático). Eventos custom
     (Lead, CompleteRegistration...) ficam DESLIGADOS pela flag abaixo —
     quando a próxima etapa for liberada, basta mudar para true.
   - GTM/GA4: ainda sem ID; os pushes de dataLayer abaixo já existem mas
     são inertes até o GTM ser instalado (etapa futura). */
const PIXEL_CUSTOM_EVENTS = false;

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

export function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  captureUtms();
  if (document.readyState === "complete") {
    scheduleLoaders();
  } else {
    window.addEventListener("load", scheduleLoaders, { once: true });
  }
}

/** Evento padrão para o dataLayer (lido pelo GTM/GA4). */
export function track(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** Evento custom do Meta Pixel — no-op enquanto PIXEL_CUSTOM_EVENTS
    for false (só a instalação base está autorizada nesta etapa). */
export function pixelTrack(eventName, params = {}) {
  if (!PIXEL_CUSTOM_EVENTS) return;
  if (typeof window.fbq === "function") window.fbq("track", eventName, params);
}

/** UTMs capturados na chegada (persistem na aba via sessionStorage). */
export function getStoredUtms() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/* ---------- interno ---------- */

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

function scheduleLoaders() {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(() => {
    loadGTM();
    loadMetaPixel();
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

function loadMetaPixel() {
  const id = ANALYTICS_IDS.META_PIXEL_ID;
  if (!id) return;
  if (!window.fbq) {
    const n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", id);
  window.fbq("track", "PageView");
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
