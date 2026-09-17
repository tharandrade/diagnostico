/* =========================================================
   main.js — Bootstrap: liga os módulos aos elementos da página.
   Carregado com type="module" (deferido por padrão).
   ========================================================= */

import { CONFIG } from "./config.js";
import { initAnalytics, trackWhatsAppClick } from "./analytics.js";
import { initQuiz, openQuiz } from "./quiz-engine.js";
import { initReveals, initStickyBar, initVideoFacade } from "./ui.js";
import { buildWhatsAppUrl } from "./scoring.js";

initAnalytics();
initQuiz();
initReveals();
initStickyBar();
initVideoFacade();

/* Todos os CTAs de diagnóstico abrem o quiz */
document.querySelectorAll(".js-open-quiz").forEach((btn) => {
  btn.addEventListener("click", () => openQuiz(btn));
});

/* Links de WhatsApp direto (botão flutuante + "Fale conosco").
   data-wa-direct identifica o elemento real no HTML; mapeamos para
   o vocabulário de "placement" pedido pelo tracking — o botão
   flutuante é obrigatoriamente "floating_button". */
const WA_PLACEMENTS = {
  flutuante: "floating_button",
  contato: "contact_section",
};
const directUrl = buildWhatsAppUrl(
  CONFIG.whatsappNumber,
  CONFIG.whatsappDirectMessage
);
document.querySelectorAll("[data-wa-direct]").forEach((link) => {
  link.href = directUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.addEventListener("click", () =>
    trackWhatsAppClick(WA_PLACEMENTS[link.dataset.waDirect] || link.dataset.waDirect)
  );
});

/* Redes sociais do "Fale conosco" (href="#" enquanto não configuradas) */
const social = { instagram: CONFIG.instagramUrl, youtube: CONFIG.youtubeUrl };
document.querySelectorAll("[data-social]").forEach((link) => {
  const url = social[link.dataset.social];
  if (url) link.href = url;
});
