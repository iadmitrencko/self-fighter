// Draws the icons of the site and its image for social networks in the colors of the game:
// `make og` (section 6.3 of the plan). The mark comes from the logo of the header, the colors from
// the palette of the game and the hetman from the copy of his picture on the landing, so whenever
// one of them changes, `make og` draws the images anew. It is no test: it lives next to the
// end-to-end tests for the browser of Playwright.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const read = (path, encoding = 'utf8') => readFileSync(new URL(path, root), encoding);
const write = (path, data) => writeFileSync(new URL(path, root), data);

function pick(text, pattern, what) {
  const match = text.match(pattern);

  if (match === null) {
    throw new Error(`${what} is not found.`);
  }

  return match[1];
}

// The palette of the game, which every page loads (styles/kozak.css).
const tokens = pick(read('frontend/src/styles/kozak.css'), /(:root\s*\{[^}]*\})/, 'The palette in kozak.css');
const color = (name) => pick(tokens, new RegExp(`--${name}:\\s*([^;]+);`), `--${name} in kozak.css`).trim();

// Two triangles facing each other, the player in gold and the enemy in red, as in the header.
const logo = read('backend/templates/site/_logo.html.twig');
const you = pick(logo, /class="logo__you" d="([^"]+)"/, 'The triangle of the player in _logo.html.twig');
const rival = pick(logo, /class="logo__rival" d="([^"]+)"/, 'The triangle of the enemy in _logo.html.twig');
const mark = `<path fill="${color('k-gold')}" d="${you}"/><path fill="${color('k-ember')}" d="${rival}"/>`;

// The hetman as the landing shows him: Vitest copies him from the game (src/app/kozak/art).
const hetman = read('backend/templates/home/art/hero.svg.twig');

// The fonts of the game as the site serves them: frontend/node_modules after `make up`.
const SUBSETS = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

function face(family, weight) {
  const name = family.toLowerCase();

  return Object.entries(SUBSETS)
    .map(([subset, range]) => {
      const file = `frontend/node_modules/@fontsource/${name}/files/${name}-${subset}-${weight}-normal.woff2`;
      let data;

      try {
        data = read(file, 'base64');
      } catch {
        throw new Error(`${file} is missing: make up installs the fonts.`);
      }

      return `@font-face { font-family: ${family}; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format('woff2'); unicode-range: ${range}; }`;
    })
    .join('\n');
}

// The words of the landing (home.hero in messages.uk.yaml). site.og_image_alt describes the image,
// so it changes together with them.
const EYEBROW = 'Гра «Козак»';
const TITLE = 'Від джури до&nbsp;гетьмана&nbsp;— підхід за&nbsp;підходом.';
const LINES = ['Відтискання, присідання, підтягування.', 'Безкоштовно й без реєстрації.'];

// The image of a link in social networks, 1200×630: the hero of the landing in short.
const og = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<style>
${face('Cormorant', 700)}
${face('Manrope', 600)}
${face('Manrope', 700)}
${face('Unbounded', 900)}
${tokens}
html,
body {
  margin: 0;
}
body {
  width: 1200px;
  height: 630px;
  overflow: hidden;
  /* A glow of gold behind the hetman, as on the landing. */
  background: radial-gradient(760px 440px at 79% 50%, var(--k-gold-wash), transparent 70%), var(--k-bg);
  color: var(--k-parchment);
  font-family: Manrope, sans-serif;
}
.og {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 336px;
  gap: 64px;
  align-items: center;
  height: 100%;
  padding: 0 84px 0 80px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: Unbounded, sans-serif;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.logo svg {
  width: 49px;
  height: 49px;
  flex: none;
}
.eyebrow {
  margin: 52px 0 0;
  color: var(--k-gold);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
}
h1 {
  margin: 14px 0 0;
  color: var(--k-parchment-bright);
  font-family: Cormorant, serif;
  font-size: 82px;
  font-weight: 700;
  line-height: 0.98;
  text-shadow: var(--k-title-shadow);
}
.lines {
  margin: 30px 0 0;
  color: var(--k-parchment-dim);
  font-size: 25px;
  font-weight: 600;
  line-height: 1.45;
}
/* The hetman in a frame of gold. */
.figure {
  width: 336px;
  height: 448px;
  overflow: hidden;
  border: 1px solid var(--k-line-active);
  border-radius: var(--k-r-card);
  box-shadow: var(--k-glow-card);
}
.figure svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
</head>
<body>
<div class="og">
  <div>
    <div class="logo"><svg viewBox="0 0 36 36" aria-hidden="true">${mark}</svg>Self-Fighter</div>
    <p class="eyebrow">${EYEBROW}</p>
    <h1>${TITLE}</h1>
    <p class="lines">${LINES.join('<br>')}</p>
  </div>
  <div class="figure">${hetman}</div>
</div>
</body>
</html>`;

// The mark alone: the favicon crops it to the triangles, the icon of iOS draws it at 135 of 180 px
// on the background of the game, as iOS needs a picture without transparency.
const icon = (viewBox, size, background = '') =>
  `<!doctype html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" style="display:block">${background}${mark}</svg></body>`;

// An icon file of one image: the 32 px PNG as it is, behind the header of the format.
function ico(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(1, 4); // of one image
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18); // where the image starts

  return Buffer.concat([header, png]);
}

const browser = await chromium.launch();

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const render = async (html, width, height, transparent = false) => {
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    return page.screenshot({ omitBackground: transparent });
  };

  write('backend/public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 32 32">${mark}</svg>\n`);
  write('backend/public/favicon.ico', ico(await render(icon('2 2 32 32', 32), 32, 32, true), 32));
  const background = `<rect x="-6" y="-6" width="48" height="48" fill="${color('k-bg')}"/>`;
  write('backend/public/apple-touch-icon.png', await render(icon('-6 -6 48 48', 180, background), 180, 180));

  const image = await render(og, 1200, 630);
  const missing = await page.evaluate(() =>
    ['Cormorant', 'Manrope', 'Unbounded'].filter(
      (family) => ![...document.fonts].some((font) => font.family === family && font.status === 'loaded'),
    ),
  );

  if (missing.length > 0) {
    throw new Error(`The fonts did not load: ${missing.join(', ')}.`);
  }
  write('backend/public/og.png', image);
} finally {
  await browser.close();
}

console.log('Drawn: backend/public/favicon.svg, favicon.ico, apple-touch-icon.png, og.png');
