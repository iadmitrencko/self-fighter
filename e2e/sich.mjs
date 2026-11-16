// The Zaporozhian Sich at sunset, behind the cossack of every look (portraits.mjs): the maidan, the
// kurins under thatch, the palisade with a watchtower, the wooden church and smoke from a stove. The
// frame is 720 × 960 and the cossack stands in its middle with his soles at y = 898, so the buildings
// keep to the sides. The horizon passes his hips and the buildings stand far behind him, by it.
const W = 720;
const H = 960;

// A seeded random, so every run draws the same Sich.
function random(seed) {
  let s = seed >>> 0;

  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = random(1709);
const r = (a, b) => a + (b - a) * rnd();
const f = (n) => Math.round(n * 10) / 10;
const times = (n, draw) => [...Array(n).keys()].map(draw).join('');

let clips = 0;

// A clip path of its own for a shape, to keep its texture inside it.
function clip(d) {
  clips += 1;

  return [`c${clips}`, `<clipPath id="c${clips}"><path d="${d}"/></clipPath>`];
}

// Sharpened logs across the frame, bound by two rails.
function palisade(base, top) {
  const parts = [];
  let x = -14;

  while (x < W + 14) {
    const w = r(10, 14);
    const h = top + r(-5, 6);
    const tip = r(9, 13);
    const lean = r(-1.2, 1.2);
    parts.push(`<path fill="url(#log)" d="M${f(x)} ${base} V${f(h)} L${f(x + w / 2 + lean)} ${f(h - tip)} L${f(x + w)} ${f(h)} V${base}Z"/>`);
    x += w + r(0.3, 1.1);
  }
  parts.push(`<rect x="-10" y="${top + 24}" width="${W + 20}" height="6" fill="#241a12" opacity=".8"/>`);
  parts.push(`<rect x="-10" y="${top + 23}" width="${W + 20}" height="1.6" fill="#b48650" opacity=".4"/>`);
  parts.push(`<rect x="-10" y="${top + 62}" width="${W + 20}" height="6" fill="#241a12" opacity=".8"/>`);

  return parts.join('');
}

// Horizontal logs of a wall.
function logWall(x0, x1, y0, y1, h = 9) {
  return times(Math.ceil((y1 - y0) / h), (i) => `<rect x="${f(x0)}" y="${f(y0 + i * h)}" width="${f(x1 - x0)}" height="${f(h + 0.6)}" rx="${f(h / 2)}" fill="url(#logH)"/>`);
}

// Vertical boards of the church.
function boards(x0, x1, y0, y1, step = 4.5) {
  return times(Math.ceil((x1 - x0) / step), (i) => `<path d="M${f(x0 + i * step)} ${f(y0)} V${f(y1)}" stroke="#1c140d" stroke-width=".8" opacity="${f(r(0.3, 0.55))}"/>`);
}

// Rows of shingles inside a clip.
function shingles(id, x0, x1, y0, y1, step = 6) {
  const parts = [];

  for (let y = y0, row = 0; y < y1; y += step * 0.8, row += 1) {
    for (let x = x0 - (row % 2) * (step / 2); x < x1; x += step) {
      parts.push(`<path d="M${f(x)} ${f(y)} q${f(step / 2)} ${f(step * 0.9)} ${f(step)} 0" fill="none" stroke="#120f0c" stroke-width=".8" opacity=".5"/>`);
    }
  }

  return `<g clip-path="url(#${id})">${parts.join('')}</g>`;
}

// Straw of a thatched roof, falling down its slope.
function thatch(id, x0, x1, y0, y1, count) {
  return `<g clip-path="url(#${id})">${times(count, () => {
    const light = rnd() < 0.45;

    return `<path d="M${f(r(x0, x1))} ${f(r(y0, y1))} l${f(r(-1.2, 1.2))} ${f(r(7, 15))}" stroke="${light ? '#c7a468' : '#2b2215'}" stroke-width="${f(r(0.7, 1.4))}" opacity="${f(r(0.25, 0.55))}"/>`;
  })}</g>`;
}

// A block of the church seen at an angle: a facet lit by the sun on the left, one in shade on the right.
function block(x0, x1, y0, y1, split = 0.42) {
  const xm = x0 + (x1 - x0) * split;
  const lit = `M${f(x0)} ${f(y1)} V${f(y0)} H${f(xm)} V${f(y1)}Z`;
  const shade = `M${f(xm)} ${f(y1)} V${f(y0)} H${f(x1)} V${f(y1)}Z`;
  const [a, clipA] = clip(lit);
  const [b, clipB] = clip(shade);

  return (
    `${clipA}${clipB}<path d="${lit}" fill="url(#wallLit)"/><path d="${shade}" fill="url(#wallShade)"/>` +
    `<g clip-path="url(#${a})">${boards(x0, xm, y0, y1)}</g><g clip-path="url(#${b})">${boards(xm, x1, y0, y1)}</g>`
  );
}

// A skirt of shingles around a tier, its left slope gilded by the sun.
function skirt(cx, y, wBottom, wTop, h) {
  const d = `M${f(cx - wBottom / 2)} ${f(y)} L${f(cx - wTop / 2)} ${f(y - h)} H${f(cx + wTop / 2)} L${f(cx + wBottom / 2)} ${f(y)}Z`;
  const [id, c] = clip(d);

  return (
    `${c}<path d="${d}" fill="url(#roof)"/>${shingles(id, cx - wBottom, cx + wBottom, y - h - 2, y + 4, 5)}` +
    `<path d="M${f(cx - wBottom / 2)} ${f(y)} L${f(cx - wTop / 2)} ${f(y - h)}" stroke="#f0b870" stroke-width="1.6" opacity=".75"/>` +
    `<path d="M${f(cx - wBottom / 2 - 1)} ${f(y + 0.5)} H${f(cx + wBottom / 2 + 1)}" stroke="#120e0b" stroke-width="2.2" opacity=".7"/>`
  );
}

// A frame of the wooden church: walls, tiers of drums under skirts, a pear-shaped dome and a cross.
function church(cx, base, wallW, wallH, tiers, domeH, crossH) {
  const parts = [block(cx - wallW / 2, cx + wallW / 2, base - wallH, base)];
  parts.push(`<rect x="${f(cx - wallW * 0.32)}" y="${base - wallH + 20}" width="9" height="15" rx="4.5" fill="#160f0a"/>`);
  parts.push(`<rect x="${f(cx - wallW * 0.32 + 2)}" y="${base - wallH + 24}" width="5" height="9" rx="2.5" fill="#f2b660" opacity=".6"/>`);
  let y = base - wallH;
  let w = wallW;

  for (const [hSkirt, hDrum] of tiers) {
    const drumW = w * 0.68;
    parts.push(block(cx - drumW / 2, cx + drumW / 2, y - hSkirt - hDrum, y - hSkirt + 3));
    parts.push(skirt(cx, y + 2, w + 18, drumW + 6, hSkirt));
    y = y - hSkirt - hDrum;
    w = drumW;
  }
  const dw = w * 1.1;
  const top = y - domeH;
  const side = `C${f(cx - dw / 2 - 3)} ${f(y - domeH * 0.55)} ${f(cx - dw * 0.08)} ${f(y - domeH * 0.74)} ${f(cx)} ${f(top)}`;
  const dome = `M${f(cx - dw / 2)} ${f(y + 2)} ${side} C${f(cx + dw * 0.08)} ${f(y - domeH * 0.74)} ${f(cx + dw / 2 + 3)} ${f(y - domeH * 0.55)} ${f(cx + dw / 2)} ${f(y + 2)}Z`;
  const [id, c] = clip(dome);
  parts.push(`${c}<path d="${dome}" fill="url(#dome)"/>${shingles(id, cx - dw, cx + dw, top - 2, y + 4, 4)}`);
  parts.push(`<path d="M${f(cx - dw / 2)} ${f(y + 1)} ${side}" fill="none" stroke="#f6c47c" stroke-width="1.5" opacity=".8"/>`);
  parts.push(`<path d="M${f(cx - dw / 2 - 2)} ${f(y + 2)} H${f(cx + dw / 2 + 2)}" stroke="#120e0b" stroke-width="2.4"/>`);
  const s = crossH;
  parts.push(
    `<g stroke="#f0cf8a" stroke-linecap="round" filter="url(#glint)"><path d="M${cx} ${f(top + 1)} V${f(top - s)}" stroke-width="2.2"/>` +
      `<path d="M${f(cx - s * 0.3)} ${f(top - s * 0.72)} H${f(cx + s * 0.3)}" stroke-width="2"/>` +
      `<path d="M${f(cx - s * 0.2)} ${f(top - s * 0.28)} L${f(cx + s * 0.2)} ${f(top - s * 0.42)}" stroke-width="1.8"/></g>`,
  );

  return parts.join('');
}

// A kurin: whitewashed walls with timber posts and lit windows under a high hipped roof of thatch.
function kurin(x0, x1, wallTop, base, ridgeY, windows, door) {
  const parts = [`<path d="M${x0} ${base} V${wallTop} H${x1} V${base}Z" fill="url(#whitewash)"/>`];
  parts.push(times(Math.floor((x1 - x0) / 46) + 1, (i) => `<rect x="${f(x0 + i * 46)}" y="${wallTop}" width="3.5" height="${base - wallTop}" fill="#4a3624" opacity=".55"/>`));
  parts.push(`<rect x="${x0}" y="${base - 7}" width="${x1 - x0}" height="7" fill="#5a4630" opacity=".7"/>`);
  for (const wx of windows) {
    parts.push(`<rect x="${wx - 1.5}" y="${wallTop + 10}" width="17" height="15" fill="#4a3624"/>`);
    parts.push(`<rect x="${wx}" y="${wallTop + 11.5}" width="14" height="12" fill="#e9a04d" opacity=".75"/>`);
    parts.push(`<path d="M${wx + 7} ${wallTop + 11.5} V${wallTop + 23.5} M${wx} ${wallTop + 17.5} H${wx + 14}" stroke="#3a2a1c" stroke-width="1.4"/>`);
  }
  parts.push(`<rect x="${door}" y="${wallTop + 8}" width="18" height="${base - wallTop - 8}" fill="#3a2a1b"/>`);
  const eave = wallTop + 6;
  const inset = (x1 - x0) * 0.2;
  const eaves = `M${x0 - 16} ${eave} Q${f((x0 + x1) / 2)} ${eave + 7} ${x1 + 16} ${eave}`;
  const front = `${eaves} L${f(x1 - inset)} ${ridgeY} H${f(x0 + inset)}Z`;
  const [id, c] = clip(front);
  parts.push(`${c}<path d="${front}" fill="url(#thatch)"/>${thatch(id, x0 - 16, x1 + 16, ridgeY - 4, eave + 8, Math.round((x1 - x0) * 3.2))}`);
  // The hip on the left catches the sun, the one on the right is in shade.
  parts.push(`<path d="M${x0 - 16} ${eave} L${f(x0 + inset)} ${ridgeY} L${f(x0 + inset + 10)} ${eave + 2}Z" fill="#f4c47e" opacity=".14"/>`);
  parts.push(`<path d="M${x1 + 16} ${eave} L${f(x1 - inset)} ${ridgeY} L${f(x1 - inset - 14)} ${eave + 4}Z" fill="#0f0b07" opacity=".35"/>`);
  parts.push(`<path d="M${f(x0 + inset)} ${ridgeY} H${f(x1 - inset)}" stroke="#2a2013" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<path d="${eaves}" fill="none" stroke="#1a130c" stroke-width="2.5" opacity=".6"/>`);
  parts.push(`<rect x="${x0}" y="${eave + 2}" width="${x1 - x0}" height="8" fill="#000" opacity=".22"/>`);

  return parts.join('');
}

// The watchtower of logs with a gallery under a roof of shingles and a crimson flag.
const tower = `
  <path d="M75 238 V118" stroke="#24190f" stroke-width="3"/>
  <circle cx="75" cy="116" r="3" fill="#e2c27a"/>
  <path d="M76 124 C98 116 120 130 146 122 C139 134 145 148 152 158 C126 166 102 154 76 160Z" fill="url(#flag)"/>
  <path d="M76 124 C98 116 120 130 146 122" fill="none" stroke="#e2b96a" stroke-width="1.6" opacity=".85"/>
  <path d="M76 160 C102 154 126 166 152 158" fill="none" stroke="#e2b96a" stroke-width="1.4" opacity=".6"/>
  ${logWall(28, 122, 318, 566)}
  ${times(28, (i) => `<circle cx="29" cy="${f(322.5 + i * 9)}" r="4.4" fill="#b3895a" opacity=".9"/><circle cx="121" cy="${f(322.5 + i * 9)}" r="4.4" fill="#3d2c1d" opacity=".9"/>`)}
  <rect x="56" y="356" width="9" height="20" fill="#0f0b08"/><rect x="85" y="356" width="9" height="20" fill="#0f0b08"/>
  <rect x="62" y="448" width="26" height="9" fill="#0f0b08"/>
  <path d="M6 314 H144 V323 H6Z" fill="#33251a"/>
  <path d="M6 314 H144" stroke="#c99a64" stroke-width="1.4" opacity=".6"/>
  ${times(10, (i) => `<rect x="${10 + i * 14}" y="284" width="4" height="30" fill="${i < 3 ? '#9a7850' : '#35271b'}"/>`)}
  <rect x="6" y="290" width="138" height="4" fill="#45331f"/>
  <path d="M-6 288 L75 222 L156 288Z" fill="url(#roof)"/>
  <clipPath id="towerRoof"><path d="M-6 288 L75 222 L156 288Z"/></clipPath>
  ${shingles('towerRoof', -6, 156, 220, 290)}
  <path d="M-6 288 L75 222" stroke="#f0b870" stroke-width="2" opacity=".75"/>
  <path d="M-8 288.5 H158" stroke="#120e0b" stroke-width="2.5" opacity=".7"/>`;

// Smoke from the stove of a kurin: puffs that grow and thin out as they rise and drift to the right.
const smoke = (() => {
  const path = [[122, 446], [132, 400], [156, 352], [196, 312], [252, 280], [324, 254], [404, 236], [492, 222], [590, 212], [700, 206]];

  return times(70, (i) => {
    const t = i / 69;
    const seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    const u = t * (path.length - 1) - seg;
    const [x0, y0] = path[seg];
    const [x1, y1] = path[seg + 1];
    const x = x0 + (x1 - x0) * u + r(-6, 6) * (0.4 + t);
    const y = y0 + (y1 - y0) * u + r(-5, 5) * (0.4 + t);
    const radius = 7 + 46 * t ** 0.8 + r(-3, 3);
    const opacity = 0.2 * (1 - t) ** 0.9 + 0.025;

    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(radius)}" fill="${t < 0.35 ? '#a49884' : '#8d8577'}" opacity="${Math.round(opacity * 100) / 100}"/>`;
  });
})();

// Clumps of dry grass in the corners, larger nearer the eye.
const grass = [[10, 958], [52, 944], [96, 962], [26, 912], [140, 966], [612, 962], [656, 940], [700, 958], [694, 906], [584, 968]]
  .map(([cx, cy]) => {
    const k = 0.6 + (cy - 880) / 140;

    return times(34, () => {
      const h = r(14, 34) * k;
      const bend = r(-10, 10) * k;
      const color = ['#6e5c38', '#54462b', '#8a7448', '#3a3020'][Math.floor(rnd() * 4)];

      return `<path d="M${f(cx + r(-14, 14) * k)} ${cy} q${f(bend / 3)} ${f(-h / 2)} ${f(bend)} ${f(-h)}" stroke="${color}" stroke-width="${f(r(1, 2.2) * k)}" opacity="${f(r(0.55, 0.9))}"/>`;
    });
  })
  .join('');

// Turns noise into a color whose alpha is the noise above a threshold: clouds and patches of earth.
const noiseAlpha = (color, gain, cut) => `0 0 0 0 ${color[0]}  0 0 0 0 ${color[1]}  0 0 0 0 ${color[2]}  ${gain} 0 0 0 ${cut}`;

export default `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="610" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#131a1c"/>
    <stop offset=".28" stop-color="#1f2826"/>
    <stop offset=".52" stop-color="#3a3f33"/>
    <stop offset=".72" stop-color="#6c5b3c"/>
    <stop offset=".86" stop-color="#a98249"/>
    <stop offset=".95" stop-color="#d4a15a"/>
    <stop offset="1" stop-color="#e0ad66"/>
  </linearGradient>
  <radialGradient id="sun" cx="-40" cy="580" r="600" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffe6a6" stop-opacity=".95"/>
    <stop offset=".2" stop-color="#f7c472" stop-opacity=".6"/>
    <stop offset=".55" stop-color="#d48d4c" stop-opacity=".2"/>
    <stop offset="1" stop-color="#d48d4c" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="halo" cx="360" cy="330" r="330" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#c9b28a" stop-opacity=".22"/>
    <stop offset=".6" stop-color="#c9b28a" stop-opacity=".08"/>
    <stop offset="1" stop-color="#c9b28a" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="cloudFade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".5"/>
    <stop offset=".3" stop-color="#fff"/>
    <stop offset=".8" stop-color="#fff" stop-opacity=".75"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="clouds" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="560"><rect width="${W}" height="560" fill="url(#cloudFade)"/></mask>
  <linearGradient id="sunSide" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset=".55" stop-color="#fff" stop-opacity=".5"/>
    <stop offset="1" stop-color="#fff" stop-opacity=".15"/>
  </linearGradient>
  <mask id="lit" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="560"><rect width="${W}" height="560" fill="url(#sunSide)"/></mask>
  <filter id="cloudBody" x="0" y="0" width="${W}" height="560" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0019 0.0062" numOctaves="5" seed="11"/>
    <feColorMatrix type="matrix" values="${noiseAlpha([0.13, 0.14, 0.14], 3.4, -1.55)}"/>
    <feGaussianBlur stdDeviation="1.4"/>
  </filter>
  <!-- The undersides of the clouds that face the sun -->
  <filter id="cloudLight" x="0" y="0" width="${W}" height="560" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0019 0.0062" numOctaves="5" seed="11"/>
    <feColorMatrix type="matrix" values="${noiseAlpha([0.97, 0.7, 0.38], 3.4, -1.55)}" result="c"/>
    <feOffset in="c" dx="-6" dy="8" result="o"/>
    <feComposite in="o" in2="c" operator="out"/>
    <feGaussianBlur stdDeviation="2.4"/>
  </filter>
  <filter id="smoke" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.016 0.026" numOctaves="3" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="5"/>
  </filter>
  <!-- Out of focus, with the uneven texture of paint so the fills do not look ruled -->
  <filter id="dof" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="3" seed="8"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer result="t">
      <feFuncR type="linear" slope=".5" intercept=".55"/>
      <feFuncG type="linear" slope=".5" intercept=".55"/>
      <feFuncB type="linear" slope=".5" intercept=".55"/>
    </feComponentTransfer>
    <feBlend in="SourceGraphic" in2="t" mode="multiply"/>
    <feComposite in2="SourceGraphic" operator="in"/>
    <feGaussianBlur stdDeviation="2.1"/>
  </filter>
  <filter id="far" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>
  <filter id="mid" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1.3"/></filter>
  <filter id="near" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="glint" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- The trodden earth of the maidan: fine streaks far away, broad patches near -->
  <filter id="groundFar" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.12" numOctaves="3" seed="31"/>
    <feColorMatrix type="matrix" values="${noiseAlpha([0.16, 0.12, 0.08], 1.8, -0.75)}"/>
    <feComposite in2="SourceGraphic" operator="in"/>
    <feGaussianBlur stdDeviation="1.2"/>
  </filter>
  <filter id="ground" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.022" numOctaves="4" seed="21"/>
    <feColorMatrix type="matrix" values="${noiseAlpha([0.1, 0.075, 0.05], 1.8, -0.72)}"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="groundLight" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.009 0.03" numOctaves="3" seed="5"/>
    <feColorMatrix type="matrix" values="${noiseAlpha([0.88, 0.7, 0.46], 1.9, -0.98)}"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <linearGradient id="farFade" x1="0" y1="560" x2="0" y2="760" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".12" stop-color="#fff"/>
    <stop offset=".45" stop-color="#fff" stop-opacity=".8"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="farBand" maskUnits="userSpaceOnUse" x="-20" y="560" width="${W + 40}" height="${H - 560}"><rect x="-20" y="560" width="${W + 40}" height="${H - 560}" fill="url(#farFade)"/></mask>
  <linearGradient id="nearFade" x1="0" y1="600" x2="0" y2="760" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="nearBand" maskUnits="userSpaceOnUse" x="-20" y="560" width="${W + 40}" height="${H - 560}"><rect x="-20" y="560" width="${W + 40}" height="${H - 560}" fill="url(#nearFade)"/></mask>
  <linearGradient id="footHaze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d7a967" stop-opacity=".35"/>
    <stop offset="1" stop-color="#d7a967" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="earth" x1="0" y1="558" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#8d7150"/>
    <stop offset=".12" stop-color="#7a6244"/>
    <stop offset=".45" stop-color="#5f4c35"/>
    <stop offset=".8" stop-color="#43352a"/>
    <stop offset="1" stop-color="#2a221a"/>
  </linearGradient>
  <linearGradient id="river" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffdc96"/>
    <stop offset=".35" stop-color="#d9a55e"/>
    <stop offset="1" stop-color="#7d6545"/>
  </linearGradient>
  <linearGradient id="log" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#b08354"/>
    <stop offset=".22" stop-color="#6e5136"/>
    <stop offset=".6" stop-color="#3d2c1f"/>
    <stop offset="1" stop-color="#21180f"/>
  </linearGradient>
  <linearGradient id="logH" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#93704a"/>
    <stop offset=".35" stop-color="#5d4530"/>
    <stop offset="1" stop-color="#281e15"/>
  </linearGradient>
  <linearGradient id="wallLit" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#b48a5c"/>
    <stop offset="1" stop-color="#7d5e40"/>
  </linearGradient>
  <linearGradient id="wallShade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4a3626"/>
    <stop offset="1" stop-color="#2a1f16"/>
  </linearGradient>
  <linearGradient id="roof" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6e5c46"/>
    <stop offset=".45" stop-color="#3a322a"/>
    <stop offset="1" stop-color="#1d1915"/>
  </linearGradient>
  <linearGradient id="dome" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a7254"/>
    <stop offset=".4" stop-color="#3e362e"/>
    <stop offset="1" stop-color="#1a1714"/>
  </linearGradient>
  <linearGradient id="thatch" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9a7f4f"/>
    <stop offset=".5" stop-color="#6d5737"/>
    <stop offset="1" stop-color="#43361f"/>
  </linearGradient>
  <linearGradient id="whitewash" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#d9c29a"/>
    <stop offset=".6" stop-color="#b59e7a"/>
    <stop offset="1" stop-color="#857258"/>
  </linearGradient>
  <linearGradient id="flag" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#c03a2e"/>
    <stop offset="1" stop-color="#6e1c17"/>
  </linearGradient>
  <linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c49a58"/>
    <stop offset=".45" stop-color="#7a5a32"/>
    <stop offset="1" stop-color="#3a2a18"/>
  </linearGradient>
  <linearGradient id="barrel" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9c7448"/>
    <stop offset=".5" stop-color="#5a4128"/>
    <stop offset="1" stop-color="#2c2015"/>
  </linearGradient>
  <linearGradient id="haze" x1="0" y1="430" x2="0" y2="700" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#dba560" stop-opacity="0"/>
    <stop offset=".5" stop-color="#dba560" stop-opacity=".2"/>
    <stop offset="1" stop-color="#dba560" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="pool" cx="340" cy="880" r="380" gradientTransform="translate(0 880) scale(1 .3) translate(0 -880)" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#f2c27a" stop-opacity=".42"/>
    <stop offset=".6" stop-color="#f2c27a" stop-opacity=".14"/>
    <stop offset="1" stop-color="#f2c27a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="360" cy="470" r="660" gradientUnits="userSpaceOnUse">
    <stop offset=".45" stop-color="#0d0f10" stop-opacity="0"/>
    <stop offset=".8" stop-color="#0d0f10" stop-opacity=".42"/>
    <stop offset="1" stop-color="#0d0f10" stop-opacity=".78"/>
  </radialGradient>
</defs>

<!-- The sky at sunset, the sun low on the left behind the frame -->
<rect width="${W}" height="600" fill="url(#sky)"/>
<rect width="${W}" height="600" fill="url(#sun)"/>
<g mask="url(#clouds)">
  <rect width="${W}" height="560" filter="url(#cloudBody)" opacity=".8"/>
  <g mask="url(#lit)"><rect width="${W}" height="560" filter="url(#cloudLight)" opacity=".85"/></g>
</g>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<g filter="url(#smoke)">${smoke}</g>

<!-- The steppe beyond the Sich, a glint of the Dnipro, the maidan up to the horizon -->
<g filter="url(#far)">
  <path d="M-20 552 C70 546 150 549 230 547 S410 544 520 549 S660 546 ${W + 20} 550 V600 H-20Z" fill="#806a4a"/>
  <rect x="-20" y="553" width="${W + 40}" height="6" fill="url(#river)" opacity=".8"/>
</g>
<rect x="-20" y="558" width="${W + 40}" height="${H - 558}" fill="url(#earth)"/>

<!-- The Sich: the rampart with its palisade, the tower, the church and the kurins -->
<g filter="url(#dof)">
  <path d="M-20 574 Q360 566 ${W + 20} 574 L${W + 20} 556 Q360 548 -20 556Z" fill="#4e4230"/>
  ${palisade(560, 500)}
  ${tower}
  ${church(510, 578, 70, 80, [[17, 30], [13, 22]], 30, 22)}
  ${church(742, 578, 68, 80, [[17, 30], [13, 22]], 30, 22)}
  ${church(624, 582, 108, 112, [[22, 40], [17, 32], [13, 24]], 48, 36)}
  ${kurin(-30, 232, 528, 586, 470, [6, 82], 150)}
  <rect x="116" y="452" width="13" height="26" fill="#3d2d1f"/>
  <rect x="114" y="449" width="17" height="5" fill="#2a1f15"/>
  ${kurin(520, 760, 534, 590, 478, [572, 650, 716], 616)}
</g>
<rect y="420" width="${W}" height="240" fill="url(#haze)"/>

<g mask="url(#farBand)"><rect x="-20" y="560" width="${W + 40}" height="${H - 560}" filter="url(#groundFar)" opacity=".5"/></g>
<g mask="url(#nearBand)">
  <rect x="-20" y="560" width="${W + 40}" height="${H - 560}" filter="url(#ground)" opacity=".7"/>
  <rect x="-20" y="560" width="${W + 40}" height="${H - 560}" filter="url(#groundLight)" opacity=".28"/>
</g>
<rect x="-20" y="586" width="${W + 40}" height="40" fill="url(#footHaze)"/>

<!-- A cannon on its carriage on the left, barrels on the right -->
<g filter="url(#mid)">
  <ellipse cx="78" cy="612" rx="62" ry="6" fill="#120d09" opacity=".5"/>
  <path d="M16 612 L44 592 L60 596 L30 614Z" fill="#3f2f20"/>
  <path d="M40 594 L96 578 L100 588 L46 602Z" fill="#4c3926"/>
  <path d="M36 594 C40 586 64 578 96 572 L132 566 C138 565 140 573 134 575 L100 584 C70 592 48 600 40 601Z" fill="url(#bronze)"/>
  <path d="M40 592 C58 584 96 574 132 567" fill="none" stroke="#f3cf8a" stroke-width="1.3" opacity=".6"/>
  <rect x="64" y="578" width="3" height="16" fill="#2a1f15" transform="rotate(-16 65 586)"/>
  <circle cx="34" cy="597" r="4" fill="url(#bronze)"/>
  <circle cx="80" cy="596" r="17" fill="none" stroke="#33251a" stroke-width="4"/>
  <path d="M80 579 V613 M63 596 H97 M68 584 L92 608 M92 584 L68 608" stroke="#33251a" stroke-width="2"/>
  <circle cx="80" cy="596" r="17" fill="none" stroke="#b08354" stroke-width="1" opacity=".5" stroke-dasharray="7 30"/>
  <circle cx="80" cy="596" r="3.5" fill="#1d150d"/>
  <ellipse cx="626" cy="608" rx="58" ry="5.5" fill="#120d09" opacity=".5"/>
  <path d="M590 576 Q588 590 591 606 H615 Q618 590 616 576Z" fill="url(#barrel)"/>
  <path d="M589 581 H617 M589 600 H617" stroke="#1d150d" stroke-width="2"/>
  <path d="M618 579 Q616 593 619 608 H643 Q646 593 644 579Z" fill="url(#barrel)"/>
  <path d="M617 584 H645 M617 603 H645" stroke="#1d150d" stroke-width="2"/>
  <path d="M603 552 Q601 564 604 576 H626 Q629 564 627 552Z" fill="url(#barrel)"/>
  <path d="M602 556 H628 M602 571 H628" stroke="#1d150d" stroke-width="1.8"/>
</g>

<g filter="url(#near)" stroke-linecap="round" fill="none">${grass}</g>

<!-- The light where the cossack stands, and the frame darker at its edges -->
<rect width="${W}" height="${H}" fill="url(#pool)"/>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
