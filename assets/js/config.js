/* =========================================================
   config.js — Configuração central do site.
   Tudo que muda por decisão de negócio é editado AQUI,
   sem tocar nos outros módulos.
   ========================================================= */

export const CONFIG = {
  /* ⚠️ PLACEHOLDER — trocar pelo número real do WhatsApp.
     Formato: só dígitos, DDI + DDD + número. Ex.: "5511987654321" */
  whatsappNumber: "5599999999999",

  /* Mensagem dos botões de WhatsApp DIRETO (flutuante e "Fale conosco").
     A mensagem do fim do quiz é montada em scoring.js (cita o pilar mais fraco). */
  whatsappDirectMessage:
    "Olá! Vim pela página do diagnóstico do Método Yuka e quero conversar.",

  /* ⚠️ PLACEHOLDER — URL da política de privacidade (obrigatória para o
     consentimento LGPD do quiz). Enquanto vazia, o texto do consentimento
     aparece sem link. */
  privacyPolicyUrl: "",

  /* ⚠️ PLACEHOLDER — links do bloco "Fale conosco".
     Enquanto vazios, os botões ficam com href="#". */
  instagramUrl: "",
  youtubeUrl: "",
};
