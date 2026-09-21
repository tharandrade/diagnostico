/* =========================================================
   api/_lib/security.js — Checagem de Origin/Referer compartilhada
   pelos endpoints server-side (/api/submit-lead, /api/meta-capi).

   Não é a única proteção (cada endpoint também valida os campos
   do payload rigorosamente antes de repassar a qualquer serviço
   externo), mas evita que o endpoint público seja chamado por
   scripts de fora do domínio da própria página.
   ========================================================= */

const ALLOWED_ORIGINS = [
  "https://mydiagnostico.myuka.com.br",
  "https://www.mydiagnostico.myuka.com.br",
  "https://diagnostico.myuka.com.br",
  "https://www.diagnostico.myuka.com.br",
];

function refererOrigin(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch (e) {
    return null;
  }
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin || refererOrigin(req.headers.referer);
  if (!origin) return true; /* chamadas same-origin sem header Origin (comum em POST simples) */
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  try {
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) return true; /* preview deployments */
  } catch (e) {
    return false;
  }
  return false;
}

module.exports = { isAllowedOrigin };
