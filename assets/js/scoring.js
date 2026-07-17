/* =========================================================
   scoring.js — Cálculo do diagnóstico.
   Regra: cada resposta soma pontos ao pilar da pergunta.
   Pontuação BAIXA = situação pior. O pilar com a MENOR
   média é o "maior gargalo" citado na mensagem de WhatsApp.
   ========================================================= */

export const PILLAR_LABELS = {
  comercial: "Comercial",
  producao: "Produção",
  montagem: "Montagem",
  financeiro: "Administrativo e Financeiro",
};

/**
 * @param {Array<{pilar: string, pontos: number}>} answers
 * @returns {Object} média de pontos por pilar, ex.: { comercial: 1.5, ... }
 */
export function computeScores(answers) {
  const sum = {};
  const count = {};
  answers.forEach(({ pilar, pontos }) => {
    sum[pilar] = (sum[pilar] || 0) + pontos;
    count[pilar] = (count[pilar] || 0) + 1;
  });
  const avg = {};
  Object.keys(sum).forEach((p) => {
    avg[p] = sum[p] / count[p];
  });
  return avg;
}

/** Pilar com a menor média (primeiro em caso de empate). */
export function weakestPillar(scores) {
  let weakest = null;
  Object.entries(scores).forEach(([pilar, valor]) => {
    if (weakest === null || valor < scores[weakest]) weakest = pilar;
  });
  return weakest;
}

/**
 * Mensagem pré-preenchida do WhatsApp ao concluir o quiz.
 * UTMs (quando existem) entram como sufixo curto para permitir
 * atribuição de campanha na conversa.
 */
export function buildWhatsAppMessage(pillarKey, utms = {}) {
  const label = PILLAR_LABELS[pillarKey] || "minha operação";
  let msg =
    "Olá! Fiz o diagnóstico do Método Yuka e meu maior gargalo parece estar em " +
    label +
    ".";
  const ref = [utms.utm_source, utms.utm_campaign].filter(Boolean).join(" / ");
  if (ref) msg += "\n\nref: " + ref;
  return msg;
}

export function buildWhatsAppUrl(number, message) {
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
