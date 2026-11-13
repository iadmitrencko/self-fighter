/*
 * «Степові вовки»: the pieces of the Wild Field, the open steppe the band rides across. The map of
 * the campaign and the maps of its stages are drawn with them: burial mounds with stone idols,
 * dry ravines, riders, the grey standards of the band and the shields of its crossbowmen.
 */

type Point = readonly [x: number, y: number];

// The grass of the steppe under the moon, cooler than the roads of «Чорний прапор».
export const FIELD = '#323630';
export const FIELD_LIGHT = '#3A3F35';
export const FIELD_DARK = '#2A2E29';

const SILHOUETTE = '#121416';
const WOOD = '#3B2A1E';
const WOOD_DARK = '#1E1610';
const IRON = '#9AA0A6';

// Tufts of feather grass.
export function Grass({ tufts }: { tufts: readonly Point[] }) {
  const d = tufts.map(([x, y]) => `M${x} ${y} q-2 -10 -8 -16 M${x} ${y} q0 -12 2 -20 M${x} ${y} q3 -9 10 -14`).join(' ');

  return <path d={d} stroke="#66705A" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />;
}

// A burial mound of the steppe; a stone idol stands on the older ones.
export function Kurgan({ x, y, scale = 1, idol = false }: { x: number; y: number; scale?: number; idol?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-80 0 C-56 -40 56 -40 80 0Z" fill="#434939" stroke="#2A2E26" strokeWidth="2" />
      {idol && <path d="M-7 -28 V-44 Q-7 -54 0 -54 Q7 -54 7 -44 V-28Z" fill="#74776A" stroke="#2A2E26" strokeWidth="1.5" />}
    </g>
  );
}

// A balka: a dry ravine cut into the steppe, where a band waits unseen.
export function Ravine({ d, wide = false }: { d: string; wide?: boolean }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#474E40" strokeWidth={wide ? 44 : 30} />
      <path d={d} stroke="#23271F" strokeWidth={wide ? 32 : 20} />
      <path d={d} stroke="#171A15" strokeWidth={wide ? 12 : 7} />
    </g>
  );
}

// The stones of a ford where a road crosses a river.
export function Ford({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#6B6F66">
      <ellipse cx={x - 14} cy={y - 3} rx="7" ry="4" />
      <ellipse cx={x} cy={y + 1} rx="6" ry="4" />
      <ellipse cx={x + 14} cy={y - 3} rx="7" ry="4" />
    </g>
  );
}

// The tracks a band of riders leaves in the grass.
export function Hoofprints({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#1C1F1A" strokeWidth="5" strokeDasharray="0.1 13" strokeLinecap="round" />;
}

// A horse of the band with its rider, or alone in a pen. It looks to the right unless turned.
export function Horse({
  x,
  y,
  scale = 1,
  turned = false,
  rider = true,
  spear = false,
}: {
  x: number;
  y: number;
  scale?: number;
  turned?: boolean;
  rider?: boolean;
  spear?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${turned ? -scale : scale} ${scale})`} fill={SILHOUETTE}>
      <path d="M-16 -20 C-14 -24 4 -24 8 -22 L14 -32 L17 -33 L24 -26 L21 -23 L14 -24 L12 -16 L12 0 H9 L8 -10 H-10 L-11 0 H-14 L-16 -12Z" />
      <path d="M-16 -19 C-22 -18 -24 -12 -25 -6" stroke={SILHOUETTE} strokeWidth="3" strokeLinecap="round" fill="none" />
      {rider && (
        <>
          <circle cx="0" cy="-38" r="4" />
          <path d="M-5 -22 L-3 -34 H3 L5 -22Z" />
          {spear && <path d="M-12 -24 L22 -50" stroke={SILHOUETTE} strokeWidth="2.5" strokeLinecap="round" />}
        </>
      )}
    </g>
  );
}

// The standard of the band: a pole with grey horsetails, the colour of the wolf.
export function Standard({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 V-62 M-9 -48 H9" stroke={WOOD_DARK} strokeWidth="3" />
      <path d="M-4 -62 L0 -71 L4 -62Z" fill={IRON} />
      <path
        d="M-7 -47 C-11 -38 -9 -28 -5 -20 M0 -47 C-2 -36 0 -28 2 -18 M7 -47 C9 -38 7 -28 4 -20"
        stroke={IRON}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

// The grey wolf that gives the band its name, sitting on a rise.
export function Wolf({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M0 -14 l6 -18 l4 -14 l6 -10 l3 9 l7 3 l-4 6 l-4 2 l2 16 l14 10 l20 2 l4 8 l-58 0z"
      fill={SILHOUETTE}
    />
  );
}

// The tall shields the crossbowmen shoot from, a crossbow over them.
export function Pavises({ x, y, count = 3 }: { x: number; y: number; count?: number }) {
  const shields = Array.from({ length: count }, (_, index) => `M${x + index * 22} ${y} v-30 q9 -8 18 0 v30z`).join(' ');
  const middle = x + count * 11;

  return (
    <g>
      <path d={shields} fill="#4A3A2A" stroke={WOOD_DARK} strokeWidth="1.5" />
      <path d={`M${middle - 16} ${y - 44} H${middle + 12} M${middle + 12} ${y - 53} Q${middle + 17} ${y - 44} ${middle + 12} ${y - 35}`} stroke={WOOD_DARK} strokeWidth="3" fill="none" />
    </g>
  );
}

// Crossbow bolts stuck in the ground along a road under fire.
export function Bolts({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 0 l7 -16 M18 4 l3 -17 M34 -2 l9 -14 M50 6 l1 -17"
      stroke={WOOD_DARK}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  );
}

// The pen where the band keeps its horses.
export function Corral({ x, y, width = 120 }: { x: number; y: number; width?: number }) {
  const posts = Array.from({ length: Math.floor(width / 30) + 1 }, (_, index) => `M${x + index * 30} ${y} v-26`).join(' ');

  return (
    <path
      d={`${posts} M${x - 4} ${y - 20} H${x + width + 4} M${x - 4} ${y - 9} H${x + width + 4}`}
      stroke="#5A4130"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  );
}

// A rack of spears at the store of weapons.
export function Spears({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L8 -54 M14 0 L16 -56 M28 0 L24 -56 M42 0 L32 -54" stroke={WOOD} strokeWidth="3" strokeLinecap="round" />
      <path d="M-4 -22 H46" stroke="#5A4130" strokeWidth="4" strokeLinecap="round" />
      <path d="M5 -52 L8 -64 L11 -52Z M13 -54 L16 -66 L19 -54Z M21 -54 L24 -66 L27 -54Z M29 -52 L32 -64 L35 -52Z" fill={IRON} />
    </g>
  );
}
