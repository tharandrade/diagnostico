/* =========================================================
   scoring.js — Montagem da mensagem de WhatsApp.

   ⚠️ Não existe mais pontuação/pilar calculado: o quiz real
   (prints confirmados) não revela resultado na tela. A
   "análise" acontece na conversa — este módulo só resume as
   3 respostas + nome do lead na mensagem pré-preenchida.

   O texto-base da mensagem é funcional (não é copy aprovada);
   confirmar com a cliente se quiser ajustar o tom.
   ========================================================= */

/**
 * Mensagem aberta ao clicar em "RECEBER MINHA ANÁLISE →".
 * @param {{nome: string, email: string, respostas: Array<{rotulo: string, resposta: string}>}} lead
 * @param {Object} utms — UTMs capturados na chegada (atribuição de campanha)
 */
export function buildWhatsAppMessage(lead, utms = {}) {
  const linhas = [
    "Olá! Sou " +
      lead.nome +
      " e acabei de concluir o diagnóstico do Método Yuka.",
    "",
    "Minhas respostas:",
  ];
  lead.respostas.forEach(({ rotulo, resposta }) => {
    linhas.push("• " + rotulo + ": " + resposta);
  });
  if (lead.email) linhas.push("", "E-mail: " + lead.email);
  linhas.push(
    "",
    "Gostaria de agendar a conversa de direcionamento com a Thabata."
  );
  return linhas.join("\n");
}

export function buildWhatsAppUrl(number, message) {
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
