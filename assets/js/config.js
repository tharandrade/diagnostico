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
  youtubeVideoId: "Id0ujvS9rP4",

  /* Reservada para uso futuro (ex.: link no rodapé). O checkbox de
     consentimento LGPD foi removido do quiz por decisão da cliente
     (formulário idêntico ao print) — ver nota de compliance no README. */
  privacyPolicyUrl: "",

  /* Links reais do bloco "Fale conosco" (também estão no HTML como href
     estático — manter os dois em sincronia se mudarem). */
  instagramUrl: "https://www.instagram.com/metodoyuka/",
  youtubeUrl: "https://www.youtube.com/@metodoyuka",
};

/* A URL do webhook do Make.com NÃO fica mais aqui (nem em nenhum
   arquivo do frontend): o navegador não chama o Make diretamente,
   ele chama /api/submit-lead, que repassa ao Make server-side e só
   confirma sucesso depois de uma resposta HTTP real (ver
   api/submit-lead.js). Configure a URL real na variável de ambiente
   MAKE_WEBHOOK_URL do projeto na Vercel. */
