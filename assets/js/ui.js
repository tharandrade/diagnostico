/* =========================================================
   ui.js — Interações de página: reveal on scroll,
   barra de CTA fixa no mobile e utilitário de foco do modal.
   Sem bibliotecas: IntersectionObserver + classes CSS.
   ========================================================= */

/** Reveal on scroll. Com prefers-reduced-motion, tudo aparece direto. */
export function initReveals() {
  const els = document.querySelectorAll(".reveal");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduced) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/** Barra de CTA fixa no mobile: aparece depois que o hero sai da tela. */
export function initStickyBar() {
  const bar = document.getElementById("sticky-cta");
  const hero = document.getElementById("hero");
  if (!bar || !hero || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    ([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      bar.classList.toggle("is-visible", show);
      /* a classe no body empurra o botão flutuante de WhatsApp para cima */
      document.body.classList.toggle("has-sticky-cta", show);
    },
    { threshold: 0 }
  );
  io.observe(hero);
}

/** Mantém o Tab circulando dentro do modal do quiz (chamar no keydown). */
export function trapFocus(container, event) {
  const focusables = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
