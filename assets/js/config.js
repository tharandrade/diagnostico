/* =========================================================
   config.js — Configuração central do site.
   Tudo que muda por decisão de negócio é editado AQUI,
   sem tocar nos outros módulos.
   ========================================================= */

export const CONFIG = {
  /* Número real confirmado (DDI 55 + DDD 48). */
  whatsappNumber: "5548996289329",

  /* Mensagem dos botões de WhatsApp DIRETO (flutuante e "Fale conosco").
     Texto puro: a codificação de URL é feita em buildWhatsAppUrl (scoring.js). */
  whatsappDirectMessage:
    "Oi, Thabata! Quero saber mais sobre o diagnóstico gratuito da marcenaria.",

  /* Mensagem do link de WhatsApp da tela de confirmação (depois do envio
     do diagnóstico), para quem prefere conversar antes de agendar. */
  whatsappConfirmMessage:
    "Oi, Thabata! Acabei de preencher o diagnóstico da minha marcenaria, mas preferi falar com você por aqui antes de agendar nossa conversa.",

  /* Vídeo do hero: YouTube Short embutido em fachada (só carrega ao clicar). */
  youtubeVideoId: "Id0ujvS9rP4",

  /* Reservada para uso futuro (ex.: link no rodapé). O checkbox de
     consentimento LGPD foi removido do quiz por decisão da cliente
     (formulário idêntico ao print) — ver nota de compliance no README. */
  privacyPolicyUrl: "",

  /* Links reais do bloco "Fale conosco" (também estão no HTML como href
     estático — manter os dois em sincronia se mudarem). */
  instagramUrl: "https://www.instagram.com/metodoyuka/",
  youtubeUrl: "https://www.youtube.com/@metodoyuka",

  /* Página oficial de agendamento do Google Calendar, exibida (embutida
     via iframe) na tela de confirmação do diagnóstico, depois do envio
     bem-sucedido. Não é integração própria: é só o link da agenda da
     cliente, aberto incorporado + link alternativo em nova aba. */
  googleCalendarUrl: "https://calendar.app.google/2EBV9XtQREdKVbXv9",
};

/* A URL do webhook do Make.com NÃO fica mais aqui (nem em nenhum
   arquivo do frontend): o navegador não chama o Make diretamente,
   ele chama /api/submit-lead, que repassa ao Make server-side e só
   confirma sucesso depois de uma resposta HTTP real (ver
   api/submit-lead.js). Configure a URL real na variável de ambiente
   MAKE_WEBHOOK_URL do projeto na Vercel. */
