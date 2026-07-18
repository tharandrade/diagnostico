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
assets/js/quiz-engine.js    modal do quiz: 3 perguntas + formulário + confirmação
assets/js/scoring.js        monta a mensagem de WhatsApp (resumo das respostas + nome)
assets/js/ui.js             reveal on scroll, barra fixa mobile, fachada do vídeo, focus trap
assets/js/form-validation.js valida nome/WhatsApp/e-mail + consentimento LGPD + honeypot
assets/js/analytics.js      slots de GTM/Pixel/GA4 + eventos + captura de UTM
assets/fonts/               Playfair Display 700 + Inter variável (WOFF2, self-hosted)
assets/img/favicon.svg
```

## Onde editar cada coisa

| O quê | Onde |
| --- | --- |
| Número do WhatsApp (real: `5548996289329`) | `assets/js/config.js` + hrefs estáticos no `index.html` |
| Mensagem dos botões de WhatsApp direto (⚠️ texto sugerido, confirmar com a cliente) | `whatsappDirectMessage` em `assets/js/config.js` |
| Copy do quiz (4 etapas + confirmação — já é a copy aprovada dos prints) | `QUESTIONS`/`FORM_TEXT`/`CONFIRM_TEXT` em `assets/js/quiz-engine.js` |
| IDs de GTM / Meta Pixel / GA4 | `assets/js/analytics.js` (e descomente os `preconnect` no `<head>`) |
| URL da política de privacidade (LGPD) | `assets/js/config.js` |
| Links de Instagram / YouTube (reais) | `assets/js/config.js` + hrefs estáticos no `index.html` |
| ID do vídeo do hero (YouTube Short `1Ta_MJS6rYQ`) | `assets/js/config.js` (fachada em `ui.js`) |
| Cores da marca | variáveis `:root` no `<style>` do `index.html` **e** em `critical.css` |
| Texto da faixa do vídeo ("DIAGNÓSTICO MY ESSENCIAL" — grafia a confirmar) | `index.html`, seção hero |

## Imagens (como foram geradas / como regenerar)

- **Capa do vídeo** (`video-capa.webp` 41KB + `.jpg` fallback): thumbnail
  retrato oficial do Short (`i.ytimg.com/vi/1Ta_MJS6rYQ/oardefault.jpg`,
  1080x1920 / 298KB), recortada em 4:5 e redimensionada para 752x940
  (2x o tamanho de exibição). Self-hosted de propósito: a thumb remota
  estouraria o orçamento de 150KB da primeira dobra e adicionaria uma
  conexão de terceiros no caminho do LCP.
- **Foto da Thabata** (`eu.webp` 14KB + `eu.jpg` fallback, origem `eu.png`
  mantida no repositório apenas como fonte — o navegador nunca a baixa).
- Para regenerar (Node + [sharp](https://sharp.pixelplumbing.com), uso
  único de linha de comando, não é dependência do site):
  ```
  npm i sharp --no-save
  node -e "const s=require('sharp');s('origem.png').resize({width:640,withoutEnlargement:true}).webp({quality:78}).toFile('assets/img/eu.webp')"
  ```

## Vídeo do hero (fachada)

No carregamento só existe a capa self-hosted + botão de play (SVG).
O `<iframe>` do `youtube-nocookie.com` (`autoplay=1&rel=0`) só é criado
no clique (`initVideoFacade` em `ui.js`); no `mouseenter`/`touchstart`/
`focus` do play, um `preconnect` dinâmico aquece a conexão antes do
clique. A faixa "DIAGNÓSTICO MY ESSENCIAL" e a legenda são HTML real e
permanecem fora do iframe.

## CSS crítico

`assets/css/critical.css` é a **fonte** do bloco `<style>` inline no
`<head>` do `index.html` (ele não é linkado na página). Se editar o
arquivo, copie o conteúdo para o `<style>` trocando os caminhos
`../fonts/` por `assets/fonts/`. O restante do CSS (`main.css`) carrega
com o truque `media="print" onload` e não bloqueia o render.

## Fluxo do quiz (confirmado por prints)

Modal sobre a página (overlay escuro): cabeçalho "Etapa X de 4" + X +
"← Voltar" (a partir da etapa 2), barra de 4 segmentos cumulativos e o
rótulo "GRÁTIS E SEM COMPROMISSO". Etapas 1–3 são escolha única com
avanço automático (etapa 1 em grid 2x2); etapa 4 é o formulário
(nome/WhatsApp/e-mail + consentimento LGPD + honeypot) com "ENVIAR →";
a etapa 5 ("Diagnóstico recebido ✅", centralizada, sem cabeçalho) só
abre o WhatsApp no clique de "RECEBER MINHA ANÁLISE →", com mensagem
resumindo as 3 respostas + nome. **Não há pontuação/pilar calculado.**

⚠️ Sem backend: o e-mail e o telefone digitados não são enviados a
lugar nenhum — só o nome e as respostas entram na mensagem de WhatsApp
(conforme o briefing). Se a cliente quiser guardar esses dados, é
preciso ligar o formulário a um backend/planilha (ex.: webhook) ou
incluí-los na mensagem.

## Eventos de tracking

Disparados via `dataLayer` (GA4/GTM): `quiz_start` (abertura),
`quiz_step_completed` (`step` 1–4), `lead_submitted` (submit válido da
etapa 4), `quiz_completed` (exibição da etapa 5), `cta_whatsapp_click`
(com `origin`; no quiz, dispara no clique de "RECEBER MINHA ANÁLISE →"
— evento separado do lead, momentos diferentes). Meta Pixel: `PageView`,
`Lead` (submit da etapa 4), `CompleteRegistration` (etapa 5 exibida).
Com os IDs vazios nada é carregado — os scripts de terceiros só entram
**depois** do `load`, em `requestIdleCallback`.

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
- [x] Peso da primeira dobra ≈ 136 KB (HTML ~24 KB + CSS crítico inline + fontes 71 KB + capa do vídeo 41 KB) — meta < 150 KB
- [x] Capa do vídeo (LCP) com `preload` + `fetchpriority="high"`, `<picture>` WebP + fallback JPEG, `width`/`height` definidos
- [x] YouTube em fachada: iframe do `youtube-nocookie` só no clique, `preconnect` dinâmico no hover/touch — zero terceiros no load
- [x] Foto com `<picture>` WebP (14 KB) + JPEG, `loading="lazy"`, `width`/`height` definidos
- [x] CSS crítico inline; `main.css` sem bloquear render; JS como ES Modules (deferidos por padrão)
- [x] Nenhum script de terceiros no caminho do LCP (GTM/Pixel/GA4 só após `load` + idle)
- [x] Mídia dentro de caixas com `aspect-ratio` fixo + `object-fit: cover` → CLS ~0, inclusive na troca capa→iframe
- [x] Acessibilidade: contraste AA na paleta, `aria-live` no progresso do quiz, navegação por teclado + focus trap + Esc no modal, foco visível customizado, `aria-label` nos botões de ícone, alvos de toque ≥ 44px, `prefers-reduced-motion` respeitado
- [x] LGPD: checkbox de consentimento antes de abrir o WhatsApp + honeypot anti-spam acessível
- [x] Todos os CTAs terminam com "→"; copy 100% igual à aprovada

Validar após o deploy (depende de ambiente real):

- [ ] Lighthouse mobile ≥ 95 nas 4 categorias
- [ ] LCP < 2.0s · INP < 200ms · CLS < 0.05 em 4G simulado

## Pendências (não publicar sem resolver)

1. Grafia da faixa do vídeo ("DIAGNÓSTICO MY ESSENCIAL"?)
2. URL da política de privacidade (LGPD) — o checkbox de consentimento
   da etapa 4 existe por exigência do briefing (seção 11), embora não
   apareça no print; sem a URL, o texto fica sem link
3. IDs de GTM / Meta Pixel / GA4
4. Confirmar textos funcionais não aprovados: mensagem dos botões de
   WhatsApp direto (`whatsappDirectMessage` em `config.js`) e a mensagem
   final montada com o resumo das respostas (`scoring.js`)
5. Decidir destino do e-mail/telefone coletados (ver aviso na seção
   "Fluxo do quiz" — hoje não são transmitidos)
6. Paleta/logos oficiais da marca, se existirem (trocar só as variáveis CSS)

Resolvidos: copy completa do quiz (4 etapas + confirmação), número de
WhatsApp (`5548996289329`), Instagram/YouTube, vídeo do hero (Short em
fachada) e foto da Thabata.
