/* =========================================================
   form-validation.js — Validação do formulário da etapa 4.
   - Honeypot: campo "website" escondido; se um bot preencher,
     falha em silêncio (sem mensagem de erro).
   - Nome / WhatsApp / e-mail obrigatórios (validação leve,
     sem bloquear formatos legítimos).
   (Sem checkbox LGPD — decisão da cliente: formulário idêntico
   ao print. Nota de compliance no README.)
   ========================================================= */

export function validateContactForm(form) {
  const honeypot = form.querySelector('input[name="website"]');
  if (honeypot && honeypot.value.trim() !== "") {
    return { ok: false, silent: true };
  }

  const nome = form.querySelector("#lead-nome");
  const whatsapp = form.querySelector("#lead-whatsapp");
  const email = form.querySelector("#lead-email");

  [nome, whatsapp, email].forEach((el) => el.removeAttribute("aria-invalid"));

  if (!nome.value.trim() || nome.value.trim().length < 2) {
    return invalid(nome, "Preencha seu nome completo.");
  }

  const digitos = whatsapp.value.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) {
    return invalid(whatsapp, "Informe um WhatsApp válido com DDD.");
  }

  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    return invalid(email, "Informe um e-mail válido.");
  }

  return { ok: true };
}

function invalid(field, message) {
  field.setAttribute("aria-invalid", "true");
  return { ok: false, message, field };
}

export function showFormError(form, message, field) {
  const box = form.querySelector(".quiz-error");
  if (box) {
    box.textContent = message;
    box.hidden = false;
  }
  if (field && typeof field.focus === "function") field.focus();
}

export function clearFormError(form) {
  const box = form.querySelector(".quiz-error");
  if (box) box.hidden = true;
}
