# Método Yuka — Landing de Diagnóstico

Landing page estática (HTML + CSS + JS vanilla, sem build) do funil de
diagnóstico para donos(as) de marcenaria: **Anúncio → Landing → Quiz →
conversa no WhatsApp**.

## Como rodar localmente

Não há build. Duas opções:

1. Abrir `index.html` direto no navegador — funciona, **mas** os ES Modules
   exigem servidor em alguns navegadores. Prefira a opção 2:
2. Servidor estático simples na raiz do projeto:
   ```
   npx serve .
   # ou
   python -m http.server 8000
   ```
   e acesse `http://localhost:8000`.

## Estrutura

```
index.html                  página inteira (CSS crítico inline no <head>)
assets/css/critical.css     FONTE do CSS crítico (ver "CSS crítico" abaixo)
assets/css/main.css         CSS não crítico (carrega sem bloquear render)
assets/js/config.js         ⚙️ número do WhatsApp, links, política de privacidade
assets/js/quiz-engine.js    perguntas (PLACEHOLDER) + navegação do quiz
assets/js/scoring.js        cálculo do pilar mais fraco + mensagem de WhatsApp
assets/js/ui.js             reveal on scroll, barra fixa mobile, focus trap
assets/js/form-validation.js consentimento LGPD + honeypot
assets/js/analytics.js      slots de GTM/Pixel/GA4 + eventos + captura de UTM
assets/fonts/               Playfair Display 700 + Inter variável (WOFF2, self-hosted)
assets/img/favicon.svg
```

## Onde editar cada coisa

| O quê | Onde |
| --- | --- |
| **Número do WhatsApp** (placeholder `5599999999999`) | `assets/js/config.js` |
| **Perguntas do quiz** (hoje `[A CONFIRMAR]` — **não publicar assim**) | array `QUESTIONS` em `assets/js/quiz-engine.js` |
| IDs de GTM / Meta Pixel / GA4 | `assets/js/analytics.js` (e descomente os `preconnect` no `<head>`) |
| URL da política de privacidade (LGPD) | `assets/js/config.js` |
| Links de Instagram / YouTube | `assets/js/config.js` |
| Cores da marca | variáveis `:root` no `<style>` do `index.html` **e** em `critical.css` |
| Texto da faixa do vídeo ("DIAGNÓSTICO MY ESSENCIAL" — grafia a confirmar) | `index.html`, seção hero |
| Vídeo do hero / foto da Thabata | trocar o conteúdo dos `.media-frame` no `index.html` (manter as proporções 4/5 e 3/4 para não gerar CLS). Recomendado para o vídeo: padrão *facade* — imagem de capa + play; o arquivo só carrega no clique |

## CSS crítico

`assets/css/critical.css` é a **fonte** do bloco `<style>` inline no
`<head>` do `index.html` (ele não é linkado na página). Se editar o
arquivo, copie o conteúdo para o `<style>` trocando os caminhos
`../fonts/` por `assets/fonts/`. O restante do CSS (`main.css`) carrega
com o truque `media="print" onload` e não bloqueia o render.

## Eventos de tracking

Disparados via `dataLayer` (GA4/GTM): `quiz_start`, `quiz_step_completed`
(com `step`), `quiz_completed`, `lead_submitted` (com `pilar`),
`cta_whatsapp_click` (com `origin`). Meta Pixel: `PageView`,
`CompleteRegistration` (tela final do quiz), `Lead` (envio do
consentimento). Com os IDs vazios nada é carregado — os scripts de
terceiros só entram **depois** do `load`, em `requestIdleCallback`.

UTMs (`utm_*`, `gclid`, `fbclid`) são capturados na chegada, guardados em
`sessionStorage` e anexados à mensagem de WhatsApp (`ref: fonte / campanha`)
para atribuição.

## Testar no Lighthouse

1. Chrome DevTools → aba **Lighthouse**.
2. Device: **Mobile** · Categorias: todas · Throttling padrão (4G simulado).
3. Rode contra o site **publicado** (ou servidor local) — abrir via `file://`
   distorce os números.
4. Metas: Performance/A11y/Best Practices/SEO ≥ 95 · LCP < 2s · CLS < 0.05.

## Publicar

Qualquer host estático serve (Netlify, Vercel, Cloudflare Pages): arraste a
pasta ou conecte o repositório — sem comando de build, diretório de saída = raiz.
Todos já aplicam compressão (gzip/brotli) e HTTP/2 automaticamente.

Headers de cache recomendados (exemplo `_headers` do Netlify/Cloudflare Pages):

```
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=31536000, immutable
/assets/css/*
  Cache-Control: public, max-age=3600
/assets/js/*
  Cache-Control: public, max-age=3600
/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

(Fontes/ imagens nunca mudam de conteúdo sem mudar de nome; CSS/JS ficam com
cache curto porque não têm hash de versão. Minificar CSS/JS no deploy é
**opcional** — os arquivos já são pequenos.)

## Checklist de QA (metas do briefing)

Verificado no código:

- [x] Zero frameworks, zero libs, zero CDN de terceiros; ícones SVG inline
- [x] 2 famílias de fonte self-hosted (WOFF2, subset latino, `font-display: swap`, preload): Playfair 700 (23 KB) + Inter variável 400–600 (48 KB)
- [x] Peso da primeira dobra ≈ 90 KB (HTML + CSS crítico inline + 2 fontes) — meta < 150 KB
- [x] CSS crítico inline; `main.css` sem bloquear render; JS como ES Modules (deferidos por padrão)
- [x] Nenhum script de terceiros no caminho do LCP (GTM/Pixel/GA4 só após `load` + idle)
- [x] Placeholders de mídia com `aspect-ratio` fixo → CLS ~0 agora e quando a mídia real entrar
- [x] Acessibilidade: contraste AA na paleta, `aria-live` no progresso do quiz, navegação por teclado + focus trap + Esc no modal, foco visível customizado, `aria-label` nos botões de ícone, alvos de toque ≥ 44px, `prefers-reduced-motion` respeitado
- [x] LGPD: checkbox de consentimento antes de abrir o WhatsApp + honeypot anti-spam acessível
- [x] Todos os CTAs terminam com "→"; copy 100% igual à aprovada

Validar após o deploy (depende de ambiente real):

- [ ] Lighthouse mobile ≥ 95 nas 4 categorias
- [ ] LCP < 2.0s · INP < 200ms · CLS < 0.05 em 4G simulado

## Pendências (não publicar sem resolver)

1. **Perguntas reais do quiz** — hoje são placeholders `[A CONFIRMAR]`
2. **Número do WhatsApp** real em `config.js`
3. Grafia da faixa do vídeo ("DIAGNÓSTICO MY ESSENCIAL"?)
4. URL da política de privacidade (LGPD)
5. Links de Instagram e YouTube
6. Vídeo do hero e foto da Thabata (placeholders reservados)
7. IDs de GTM / Meta Pixel / GA4
8. Paleta/logos oficiais da marca, se existirem (trocar só as variáveis CSS)
