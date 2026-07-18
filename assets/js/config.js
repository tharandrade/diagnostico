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

  /* Reservada para uso futuro (ex.: link no rodapé). O checkbox de
     consentimento LGPD foi removido do quiz por decisão da cliente
     (formulário idêntico ao print) — ver nota de compliance no README. */
  privacyPolicyUrl: "",

  /* Links reais do bloco "Fale conosco" (também estão no HTML como href
     estático — manter os dois em sincronia se mudarem). */
  instagramUrl: "https://www.instagram.com/metodoyuka/",
  youtubeUrl: "https://www.youtube.com/@metodoyuka",
};

/* TODO: cole aqui a URL real do webhook "Custom Webhook" criado no
   cenário do Make.com (captura de leads — seção 11 do briefing).
   Enquanto o placeholder estiver aqui, NENHUM envio é feito (o código
   detecta o "[" inicial e pula em silêncio). Não usar URL inventada. */
export const MAKE_WEBHOOK_URL = "[COLE_A_URL_DO_WEBHOOK_MAKE_AQUI]";
