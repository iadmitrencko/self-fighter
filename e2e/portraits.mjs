// Draws the cossack of every look on the maidan of the Sich (§24.2): `make portraits`. The figures are
// the photos of the ranks cut out of their studio, with the edges the crop had cut off drawn anew
// (cossacks/*.png, a figure of a look per file); the Sich behind them is drawn in SVG (sich.mjs) out
// of focus. The cossack gets his shadow on the ground and the warm light of the sunset on his left
// edge, and a little grain over the whole picture makes one picture of the two. Every portrait is
// written as WebP in two widths for srcset into frontend/src/app/kozak/art/cossack, which the game and
// the landing show; og.png takes the hetman from there, so `make og` runs after. It is no test: like
// og.mjs, it lives next to the end-to-end tests for the browser of Playwright.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import sich from './sich.mjs';

const root = new URL('../', import.meta.url);
const LOOKS = ['recruit', 'cossack', 'officer', 'general', 'hetman'];
const OUT = 'frontend/src/app/kozak/art/cossack';

// The frame of sich.mjs and the place of the cossack in it: in the middle, the soles at FEET.
const FRAME = { width: 720, height: 960, feet: 898, scale: 0.96 };

// Runs in the browser: everything it needs comes in its argument.
async function compose({ backdrop, figures, frame }) {
  const { width: W, height: H, feet: FEET, scale: SCALE } = frame;
  const load = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${src.slice(0, 40)}… does not load.`));
      image.src = src;
    });
  const canvas = (width = W, height = H) => {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    const context = element.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingQuality = 'high';

    return [element, context];
  };
  const pixels = (context) => context.getImageData(0, 0, W, H).data;
  const blurred = (source, radius) => {
    const [, context] = canvas();
    context.filter = `blur(${radius}px)`;
    context.drawImage(source, 0, 0);

    return pixels(context);
  };

  // The Sich comes at twice the size and is smoothed down to the frame.
  const [, back] = canvas();
  back.drawImage(await load(`data:image/png;base64,${backdrop}`), 0, 0, W, H);
  const B = pixels(back);

  // The grain, the same on every run.
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

    return seed / 2 ** 32;
  };
  const grain = Float32Array.from({ length: W * H }, () => (random() + random() + random() - 1.5) * 5.6);

  const pictures = {};

  for (const [look, data] of Object.entries(figures)) {
    const image = await load(`data:image/png;base64,${data}`);
    const [, source] = canvas(image.width, image.height);
    source.drawImage(image, 0, 0);
    const own = source.getImageData(0, 0, image.width, image.height).data;
    // The soles and the middle of the figure, where it stands in the frame.
    let bottom = 0;
    let sum = 0;
    let count = 0;

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        if (own[(y * image.width + x) * 4 + 3] > 127) {
          bottom = y;
          sum += x;
          count += 1;
        }
      }
    }
    const [figureCanvas, figure] = canvas();
    figure.drawImage(image, Math.round(W / 2 - (sum / count) * SCALE), Math.round(FEET - bottom * SCALE), image.width * SCALE, image.height * SCALE);
    const F = pixels(figure);

    // The figure in black: the shape of its shadow and of the edge the sun lights.
    const [silhouette, black] = canvas();
    black.drawImage(figureCanvas, 0, 0);
    black.globalCompositeOperation = 'source-in';
    black.fillRect(0, 0, W, H);

    // The shadow lies on the ground away from the sun, which stands low on the left: sharp at the
    // feet, blurred and fainter away from them.
    const [laid, ground] = canvas();
    const [kx, ky] = [0.42, 0.11];
    ground.setTransform(1, 0, -kx, ky, kx * FEET, FEET * (1 - ky));
    ground.drawImage(silhouette, 0, 0);
    ground.setTransform(1, 0, 0, 1, 0, 0);
    ground.clearRect(0, FEET + 3, W, H);
    const near = blurred(laid, 2.5);
    const far = blurred(laid, 9);

    // A dark pool right under the boots, wider than tall: blurred while stretched three times.
    const [soles, sole] = canvas();
    sole.drawImage(silhouette, 0, FEET - 26, W, H - FEET + 26, 0, FEET - 26, W, H - FEET + 26);
    const [tall, stretched] = canvas(W, H * 3);
    stretched.filter = 'blur(9px)';
    stretched.drawImage(soles, 0, 0, W, H * 3);
    const [, pool] = canvas();
    pool.drawImage(tall, 0, 4, W, H);
    const P = pixels(pool);

    // The left edge of the figure, where the light of the sunset falls.
    const [edge, rim] = canvas();
    rim.drawImage(silhouette, 0, 0);
    rim.globalCompositeOperation = 'destination-out';
    rim.drawImage(silhouette, 4, 0);
    const R = blurred(edge, 1.2);

    const [result, out] = canvas();
    const picture = out.createImageData(W, H);
    const O = picture.data;
    const shadowTint = [0.92, 0.95, 1];
    const warmth = [1.02, 1, 0.965];
    const sunset = [0.55, 0.43, 0.26];

    for (let y = 0; y < H; y += 1) {
      const away = Math.min(1, Math.max(0, (FEET - y) / 110));
      // The low sun reaches the head more than the boots.
      const height = 1 - (0.65 * y) / (H - 1);

      for (let x = 0; x < W; x += 1) {
        const i = y * W + x;
        const p = i * 4;
        const cast = ((near[p + 3] * (1 - away) + far[p + 3] * away) / 255) * (0.7 - 0.5 * away);
        const shade = Math.min(0.8, cast + Math.min(0.75, (P[p + 3] / 255) * 1.6));
        const a = F[p + 3] / 255;
        const light = Math.min(1, (R[p + 3] / 255) * 1.3) * a * height;

        for (let k = 0; k < 3; k += 1) {
          const behind = (B[p + k] / 255) * (1 - shade * shadowTint[k]);
          const front = 1 - (1 - (F[p + k] / 255) * warmth[k]) * (1 - light * sunset[k]);
          O[p + k] = Math.round((front * a + behind * (1 - a)) * 255 + grain[i]);
        }
        O[p + 3] = 255;
      }
    }
    out.putImageData(picture, 0, 0);
    pictures[`${look}-720`] = result.toDataURL('image/webp', 0.84);
    const [half, small] = canvas(W / 2, H / 2);
    small.drawImage(result, 0, 0, W / 2, H / 2);
    pictures[`${look}-360`] = half.toDataURL('image/webp', 0.82);
  }

  return pictures;
}

const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: FRAME.width, height: FRAME.height }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><body style="margin:0">${sich}</body>`, { waitUntil: 'load' });
  const backdrop = (await page.screenshot()).toString('base64');
  const figures = Object.fromEntries(LOOKS.map((look) => [look, readFileSync(new URL(`cossacks/${look}.png`, import.meta.url), 'base64')]));
  const pictures = await page.evaluate(compose, { backdrop, figures, frame: FRAME });

  for (const [name, url] of Object.entries(pictures)) {
    const [type, data] = url.split(',');

    if (type !== 'data:image/webp;base64') {
      throw new Error(`The browser did not encode ${name} as WebP.`);
    }
    writeFileSync(new URL(`${OUT}/${name}.webp`, root), Buffer.from(data, 'base64'));
  }
} finally {
  await browser.close();
}

console.log(`Drawn: ${OUT}/{${LOOKS.join(',')}}-{360,720}.webp`);
