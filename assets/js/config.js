/* =========================================================
   config.js — Configuração central do site.
   Tudo que muda por decisão de negócio é editado AQUI,
   sem tocar nos outros módulos.
   ========================================================= */

export const CONFIG = {
  /* Número real confirmado (DDI 55 + DDD 48). */
  whatsappNumber: "5548996289329",

  /* Mensagem dos botões de WhatsApp DIRETO (flutuante e "Fale conosco").
     ⚠️ Texto sugerido, ainda não é copy aprovada — confirmar com a cliente.
     A mensagem do fim do quiz é montada em scoring.js (cita o pilar mais fraco). */
  whatsappDirectMessage:
    "Olá! Vim pelo site do Método Yuka e quero saber mais sobre o diagnóstico.",

  /* Vídeo do hero: YouTube Short embutido em fachada (só carrega ao clicar). */
  youtubeVideoId: "1Ta_MJS6rYQ",

  /* ⚠️ PLACEHOLDER — URL da política de privacidade (obrigatória para o
     consentimento LGPD do quiz). Enquanto vazia, o texto do consentimento
     aparece sem link. */
  privacyPolicyUrl: "",

  /* Links reais do bloco "Fale conosco" (também estão no HTML como href
     estático — manter os dois em sincronia se mudarem). */
  instagramUrl: "https://www.instagram.com/metodoyuka/",
  youtubeUrl: "https://www.youtube.com/@metodoyuka",
};
