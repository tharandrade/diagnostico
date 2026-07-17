/* =========================================================
   form-validation.js — Validação do passo final do quiz.
   - Honeypot: campo "website" escondido; se um bot preencher,
     falha em silêncio (sem mensagem de erro).
   - Consentimento LGPD: obrigatório para abrir o WhatsApp.
   ========================================================= */

export function validateFinalForm(form) {
  const honeypot = form.querySelector('input[name="website"]');
  if (honeypot && honeypot.value.trim() !== "") {
    return { ok: false, silent: true };
  }

  const consent = form.querySelector("#quiz-consent");
  if (!consent || !consent.checked) {
    return {
      ok: false,
      message:
        "Para continuar, marque a caixa de consentimento acima do botão.",
    };
  }

  return { ok: true };
}

export function showFormError(form, message) {
  const box = form.querySelector(".quiz-final__error");
  if (box) {
    box.textContent = message;
    box.hidden = false;
  }
}

export function clearFormError(form) {
  const box = form.querySelector(".quiz-final__error");
  if (box) box.hidden = true;
}
