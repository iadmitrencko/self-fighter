import type { ReactNode } from 'react';
import type { CampaignId } from '../../../domain/kozak/journey';
import { routeFrom, routeTo, type LabelSide, type MapLayout } from './CampaignMap';
import { useSvgId } from './svgId';

/*
 * Screens 3–4 of kozak_design: the local map of a stage with a point for every level. The first
 * stage of «Лісові круки» follows the mockup; the others are put together from the same pieces,
 * each with the places its story names: the river, the traps and the nest of the forest, the
 * roads, camps and the fortress of «Чорний прапор».
 */

type Point = readonly [number, number];

interface StageScene {
  readonly points: readonly Point[];
  readonly labels: readonly LabelSide[];
  readonly draw: (patterns: { trees: string }) => ReactNode;
  // The colour of the land under everything: the forest by default.
  readonly ground?: string;
}

const WIDTH = 1040;
const HEIGHT = 768;

// A smooth route through the points: each curve leaves a point the way the previous one came in.
function segmentsThrough(points: readonly Point[]): string[] {
  return points.slice(1).map((point, index) => {
    const from = points[index] as Point;
    const before = points[index - 1] ?? from;
    const after = points[index + 2] ?? point;
    const c1: Point = [from[0] + (point[0] - before[0]) / 5, from[1] + (point[1] - before[1]) / 5];
    const c2: Point = [point[0] - (after[0] - from[0]) / 5, point[1] - (after[1] - from[1]) / 5];

    return `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${point[0]} ${point[1]}`;
  });
}

function sceneOf(campaign: CampaignId, stage: number): StageScene {
  return campaign === 'black-flag' ? (ROAD_SCENES[stage] ?? ROADS_FIRST) : (SCENES[stage] ?? FIRST_STAGE);
}

export function stageLayout(campaign: CampaignId, stage: number): MapLayout {
  const scene = sceneOf(campaign, stage);

  return {
    width: WIDTH,
    height: HEIGHT,
    points: scene.points,
    segments: segmentsThrough(scene.points),
    labels: scene.labels,
    currentLabels: scene.labels,
  };
}

export function StageMap({
  campaign,
  stage,
  current,
  label,
  children,
}: {
  campaign: CampaignId;
  stage: number;
  // The index of the level in progress; the number of levels once the stage is passed.
  current: number;
  label: string;
  children: ReactNode;
}) {
  const id = useSvgId('stage');
  const scene = sceneOf(campaign, stage);
  const layout = stageLayout(campaign, stage);
  const reached = Math.min(current, layout.points.length - 1);
  const passedAll = current >= layout.points.length;

  return (
    <div className="k-map k-map--stage" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
      {/* The picture covers its box like a photo, and the points follow it (kozak.css). */}
      <svg
        className="k-map__art"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern id={id('trees')} width="30" height="26" patternUnits="userSpaceOnUse">
            <rect width="30" height="26" fill="#1A2A21" />
            <path d="M8 3 L14 17 H2Z M23 11 L29 25 H17Z" fill="#284235" />
            <path d="M8 3 L10.5 9 H5.5Z M23 11 L25.5 17 H20.5Z" fill="#355743" />
          </pattern>
          <radialGradient id={id('vignette')} cx=".5" cy=".5" r=".75">
            <stop offset=".6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".55" />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill={scene.ground ?? '#2B2D22'} />
        {scene.draw({ trees: id('trees') })}
        <path d={routeTo(layout, reached)} className="k-route k-route--passed" />
        {!passedAll && <path d={routeFrom(layout, reached)} className="k-route k-route--ahead" />}
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id('vignette')})`} />
      </svg>
      {children}
    </div>
  );
}

// The pieces the maps are made of.
function Forest({ d, trees }: { d: string; trees: string }) {
  return <path d={d} fill={`url(#${trees})`} />;
}

function Creek({ d, wide = false }: { d: string; wide?: boolean }) {
  return (
    <g fill="none">
      <path d={d} stroke="#2E4652" strokeWidth={wide ? 46 : 20} strokeLinecap="round" />
      <path d={d} stroke="#3E5866" strokeWidth={wide ? 30 : 11} />
      {wide && <path d={d} stroke="#5B7A88" strokeWidth="2" strokeDasharray="10 18" opacity=".6" />}
    </g>
  );
}

function Road({ d }: { d: string }) {
  return (
    <g fill="none">
      <path d={d} stroke="#6E5C40" strokeWidth="16" strokeLinecap="round" opacity=".55" />
      <path d={d} stroke="#857052" strokeWidth="2" strokeDasharray="6 10" />
    </g>
  );
}

function Rocks({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M0 40 L30 0 L60 20 L80 -10 L110 30 L120 60 L60 70Z"
      fill="#3B3E3E"
      stroke="#22262A"
      strokeWidth="2"
    />
  );
}

function Palisade({ x, y, posts = 5 }: { x: number; y: number; posts?: number }) {
  const d = Array.from({ length: posts }, (_, index) => {
    const left = x + index * 16;

    return `M${left} ${y} v-36 l6 -10 l6 10 v36`;
  }).join(' ');

  return <path d={d} fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5" />;
}

function Tent({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 L22 -34 L44 0Z" fill="#5A4130" stroke="#2E2118" strokeWidth="1.5" />
      <path d="M38 6 L56 -22 L74 6Z" fill="#4A3628" stroke="#2E2118" strokeWidth="1.5" />
    </g>
  );
}

function Fire({ x, y }: { x: number; y: number }) {
  return <path transform={`translate(${x} ${y})`} d="M0 10 l5 -10 l4 8 l4 -12 l4 14Z" fill="#E08A3C" />;
}

function WatchPost({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
      <path d="M0 0 L6 -60 M30 0 L24 -60 M3 -30 H27 M2 -12 L28 -48 M28 -12 L2 -48" />
      <rect x="-4" y="-72" width="38" height="14" />
      <path d="M-8 -72 L15 -92 L38 -72Z" />
    </g>
  );
}

function Tower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#2A2420" stroke="#120F0C" strokeWidth="2">
      <rect x="0" y="-130" width="34" height="130" />
      <rect x="-6" y="-138" width="46" height="10" />
      <path d="M-10 -138 L17 -176 L44 -138Z" />
      <rect x="12" y="-110" width="10" height="16" fill="#E08A3C" stroke="none" opacity=".7" />
    </g>
  );
}

function Web({ x, y, r = 40 }: { x: number; y: number; r?: number }) {
  return (
    <g stroke="#6B5A40" strokeWidth="1.5" fill="none" opacity=".7" transform={`translate(${x} ${y})`}>
      <circle r={r} />
      <circle r={r * 0.65} />
      <path d={`M${-r - 4} 0 H${r + 4} M0 ${-r - 4} V${r + 4} M${-r * 0.75} ${-r * 0.75} L${r * 0.75} ${r * 0.75} M${r * 0.75} ${-r * 0.75} L${-r * 0.75} ${r * 0.75}`} />
    </g>
  );
}

function Herbs({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#5F7A3A" strokeWidth="2" fill="none">
      <path d="M0 0 C-4 -14 -10 -20 -16 -24 M0 0 C2 -16 6 -24 12 -30 M0 0 C0 -12 -2 -26 0 -36" />
      <circle cx="-16" cy="-26" r="3" fill="#8E2620" stroke="none" />
      <circle cx="12" cy="-32" r="3" fill="#8E2620" stroke="none" />
    </g>
  );
}

function Ravens({ birds }: { birds: readonly Point[] }) {
  return (
    <g fill="#0E1210">
      {birds.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y} q8 -8 16 -1 q8 -7 16 1 q-8 -3 -16 4 q-8 -7 -16 -4z`} />
      ))}
    </g>
  );
}

function Bandit({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#0E1210">
      <circle cx="0" cy="-30" r="6" />
      <path d="M-6 -24 H6 L8 0 H3 L1 -10 L-1 -10 L-3 0 H-8Z" />
      <path d="M6 -22 L18 -36" stroke="#0E1210" strokeWidth="3" />
    </g>
  );
}

function Hill({ x, y, children }: { x: number; y: number; children?: ReactNode }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="150" ry="80" fill="#3A3A2C" />
      {children}
    </g>
  );
}

// Red over the forest; the black flag of the band over its camps.
function Banner({ x, y, black = false }: { x: number; y: number; black?: boolean }) {
  const colour = black ? '#0E0C0B' : '#8E2620';

  return <path d={`M${x} ${y} l6 -26 M${x + 6} ${y - 26} l20 6 l-20 8`} stroke={colour} strokeWidth="3" fill={colour} />;
}

function Cart({ x, y, broken = false }: { x: number; y: number; broken?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${broken ? -10 : 0})`} stroke="#1E1610" strokeWidth="2">
      <path d="M-30 -24 H30 L26 -8 H-26Z" fill="#5A4130" />
      <path d="M30 -14 L54 -6" strokeWidth="3" />
      <circle cx="-16" cy="-4" r="9" fill="none" strokeWidth="3" />
      {broken ? (
        <ellipse cx="38" cy="10" rx="10" ry="4" fill="none" strokeWidth="3" />
      ) : (
        <circle cx="16" cy="-4" r="9" fill="none" strokeWidth="3" />
      )}
    </g>
  );
}

function Hut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#1E1610" strokeWidth="1.5">
      <rect x="-22" y="-26" width="44" height="26" fill="#6B5A44" />
      <path d="M-28 -24 L0 -48 L28 -24Z" fill="#4A3A26" />
      <rect x="-5" y="-14" width="10" height="14" fill="#2E2118" />
    </g>
  );
}

// Crossed stakes across a road.
function Barricade({ x, y, stakes = 3 }: { x: number; y: number; stakes?: number }) {
  const d = Array.from({ length: stakes }, (_, index) => {
    const left = x + index * 24;

    return `M${left} ${y} l18 -28 M${left + 18} ${y} l-18 -28`;
  }).join(' ');

  return (
    <g stroke="#3B2A1E" strokeWidth="5" strokeLinecap="round" fill="none">
      <path d={`M${x - 6} ${y - 14} H${x + stakes * 24}`} />
      <path d={d} />
    </g>
  );
}

function Shields({ x, y, count = 4 }: { x: number; y: number; count?: number }) {
  return (
    <g fill="#4A3A2A" stroke="#1E1610" strokeWidth="2">
      {Array.from({ length: count }, (_, index) => (
        <circle key={index} cx={x + index * 24} cy={y} r="12" />
      ))}
    </g>
  );
}

function Chests({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#7A5A2A" stroke="#2E2118" strokeWidth="1.5">
      <rect x="0" y="-16" width="26" height="16" />
      <rect x="30" y="-14" width="24" height="14" />
      <rect x="14" y="-30" width="22" height="14" />
    </g>
  );
}

// The open steppe around the Sich: dry fields and low grass.
function Steppe() {
  return (
    <g>
      <path d="M0 0 H1040 V170 C900 210 760 150 620 190 C480 230 300 170 160 210 C100 226 40 220 0 210Z" fill="#332E22" />
      <ellipse cx="250" cy="410" rx="230" ry="90" fill="#423A29" />
      <ellipse cx="780" cy="660" rx="280" ry="100" fill="#423A29" />
      <path
        d="M60 330 l5 -12 M70 332 l-3 -10 M560 300 l5 -12 M570 302 l-3 -10 M960 520 l5 -12 M970 522 l-3 -10 M380 720 l5 -12 M390 722 l-3 -10 M720 300 l5 -12 M730 302 l-3 -10"
        stroke="#5A5038"
        strokeWidth="2"
      />
    </g>
  );
}


// 1. Перші сліди: the road, the watch post, the hidden camp and the fort on the hill.
const FIRST_STAGE: StageScene = {
    points: [
      [220, 560],
      [450, 420],
      [700, 520],
      [860, 240],
    ],
    labels: ['below', 'below', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H380 C360 90 260 140 200 230 C150 300 60 300 0 330Z" />
        <Forest trees={trees} d="M0 768 V640 C60 620 100 680 140 768Z" />
        <Forest trees={trees} d="M300 768 C300 660 420 600 520 640 C600 670 600 600 640 600 C700 590 780 600 820 640 C880 700 900 768 900 768Z" />
        <Forest trees={trees} d="M560 380 C640 420 760 420 820 470 C860 520 820 580 760 580 C700 580 660 540 620 520 C560 480 520 420 560 380Z" />
        <Forest trees={trees} d="M560 0 H1040 V180 C980 160 960 100 900 80 C820 60 760 140 700 120 C640 100 600 60 560 0Z" />
        <Forest trees={trees} d="M1040 420 C980 440 940 520 960 600 C980 680 1040 700 1040 700Z" />
        <Creek d="M0 360 C200 380 300 320 420 340 S640 380 760 350 S960 320 1040 360" />
        <Road d="M0 700 C100 680 160 600 220 560 C300 510 380 470 450 420" />
        <Hill x={860} y={240}>
          <Palisade x={760} y={250} posts={3} />
          <Palisade x={928} y={250} posts={2} />
          <g fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
            <rect x="900" y="150" width="26" height="60" />
            <path d="M894 150 L913 124 L932 150Z" />
          </g>
          <Banner x={940} y={140} />
        </Hill>
        <Rocks x={960} y={290} scale={0.7} />
        <WatchPost x={500} y={395} />
        <Tent x={730} y={520} />
        <Fire x={750} y={532} />
        <Bandit x={275} y={515} />
      </>
    ),
};

// The scenes of the ten stages, in the coordinates of the wide map of the mockup (1040 × 768).
const SCENES: Readonly<Record<number, StageScene>> = {
  1: FIRST_STAGE,
  // 2. Глибше в хащі: the thicket, the crows over the posts, the nest of the scouts.
  2: {
    points: [
      [140, 640],
      [300, 520],
      [470, 610],
      [560, 420],
      [740, 480],
      [820, 300],
      [900, 160],
    ],
    labels: ['below', 'above', 'below', 'above', 'below', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H520 C480 120 360 160 300 260 C240 360 100 380 0 420Z" />
        <Forest trees={trees} d="M0 768 V700 C80 680 160 720 220 768Z" />
        <Forest trees={trees} d="M330 768 C340 700 420 660 520 690 C600 710 640 768 640 768Z" />
        <Forest trees={trees} d="M600 560 C680 540 760 580 780 640 C800 720 700 760 640 720 C590 680 560 600 600 560Z" />
        <Forest trees={trees} d="M640 0 H1040 V420 C980 400 960 330 940 280 C900 200 860 220 820 200 C760 170 700 80 640 0Z" />
        <Forest trees={trees} d="M1040 520 C960 540 920 620 960 700 C990 760 1040 768 1040 768Z" />
        <Creek d="M0 520 C120 500 200 560 300 540 S480 470 560 500" />
        <WatchPost x={290} y={500} />
        <WatchPost x={545} y={400} />
        <g transform="translate(870 150)">
          <path d="M0 0 C20 -30 60 -30 80 0 Z" fill="#2A2420" stroke="#120F0C" strokeWidth="2" />
        </g>
        <Ravens birds={[[270, 430], [320, 400], [520, 330], [780, 210], [840, 230], [930, 90], [980, 120]]} />
      </>
    ),
  },
  // 3. Серце лісу: the trails of the fighting bands and the Black Glade.
  3: {
    points: [
      [120, 430],
      [260, 600],
      [420, 470],
      [560, 620],
      [700, 450],
      [820, 570],
      [920, 260],
    ],
    labels: ['above', 'below', 'above', 'below', 'above', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H1040 V220 C960 240 900 200 840 180 C760 150 700 230 620 220 C520 200 480 300 380 300 C280 300 220 220 120 260 C60 280 30 300 0 300Z" />
        <Forest trees={trees} d="M0 768 V560 C60 540 120 620 160 680 C190 730 180 768 180 768Z" />
        <Forest trees={trees} d="M340 768 C360 700 460 690 480 720 C500 750 500 768 500 768Z" />
        <Forest trees={trees} d="M620 768 C640 690 720 660 760 700 C800 740 780 768 780 768Z" />
        <Forest trees={trees} d="M1040 400 C980 420 940 500 960 580 C980 660 1040 700 1040 700Z" />
        <ellipse cx="920" cy="300" rx="110" ry="60" fill="#262A1E" />
        <Tent x={860} y={300} scale={0.9} />
        <Fire x={930} y={316} />
        <Road d="M0 470 C80 450 100 420 120 430 C200 480 220 600 260 600 C340 600 380 470 420 470 C480 470 520 620 560 620" />
        <g stroke="#0E1210" strokeWidth="3" fill="none">
          <path d="M680 410 l10 -18 M700 410 l-6 -20" />
        </g>
        <Ravens birds={[[600, 120], [660, 90], [880, 180]]} />
      </>
    ),
  },
  // 4. Стара лісова застава: the stone path, the broken gate and the stronghold.
  4: {
    points: [
      [150, 650],
      [330, 560],
      [470, 420],
      [640, 520],
      [760, 360],
      [880, 220],
    ],
    labels: ['below', 'below', 'above', 'below', 'above', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H420 C380 120 260 200 180 300 C120 380 40 400 0 420Z" />
        <Forest trees={trees} d="M0 768 V700 C80 690 120 720 160 768Z" />
        <Forest trees={trees} d="M420 768 C440 680 540 640 600 660 C660 690 660 768 660 768Z" />
        <Forest trees={trees} d="M1040 300 C980 320 960 420 980 520 C1000 620 1040 640 1040 640Z" />
        <Rocks x={240} y={600} scale={0.6} />
        <Rocks x={400} y={470} scale={0.5} />
        <Road d="M0 700 C80 680 120 660 150 650 C240 620 280 580 330 560 C400 520 440 460 470 420" />
        <Hill x={820} y={260}>
          <Palisade x={700} y={300} posts={5} />
          <Palisade x={860} y={300} posts={5} />
          <g fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
            <rect x="800" y="200" width="40" height="70" />
            <path d="M792 200 L820 168 L848 200Z" />
          </g>
          <Banner x={840} y={170} />
        </Hill>
        <g transform="translate(470 420)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
          <path d="M-40 -6 v-30 l8 -12 l8 12 v30 M24 -6 v-30 l8 -12 l8 12 v30" />
        </g>
      </>
    ),
  },
  // 5. Кривава переправа: the wide river, the boats, the ford and the bridge.
  5: {
    points: [
      [120, 600],
      [280, 450],
      [420, 590],
      [560, 400],
      [700, 300],
      [880, 190],
    ],
    labels: ['below', 'above', 'below', 'below', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H380 C340 120 220 180 140 260 C80 320 30 330 0 340Z" />
        <Forest trees={trees} d="M0 768 V680 C80 670 140 720 160 768Z" />
        <Forest trees={trees} d="M740 768 C760 660 860 620 940 640 C1000 660 1040 700 1040 700 V768Z" />
        <Forest trees={trees} d="M760 0 H1040 V120 C980 110 940 60 880 70 C820 80 780 40 760 0Z" />
        <Creek wide d="M300 0 C380 160 640 220 600 380 S700 620 860 768" />
        <g transform="translate(560 400) rotate(20)">
          <rect x="-50" y="-11" width="100" height="22" fill="#5A4130" />
          <path d="M-50 -11 H50 M-50 11 H50" stroke="#2E2118" strokeWidth="3" />
          <path d="M-36 -11 V11 M-18 -11 V11 M0 -11 V11 M18 -11 V11 M36 -11 V11" stroke="#3B2A1E" strokeWidth="2" />
        </g>
        <g fill="#3B2A1E">
          <path d="M470 250 q20 10 40 0 l-6 10 h-28z" />
          <path d="M640 520 q20 10 40 0 l-6 10 h-28z" />
        </g>
        <Tent x={820} y={210} scale={0.8} />
        <Fire x={846} y={220} />
        <Road d="M0 640 C60 620 100 610 120 600 C200 560 240 480 280 450" />
      </>
    ),
  },
  // 6. Павутина пасток: pits, nets and tripwires between the trees.
  6: {
    points: [
      [140, 320],
      [300, 470],
      [440, 320],
      [600, 490],
      [760, 340],
      [900, 520],
    ],
    labels: ['above', 'below', 'above', 'below', 'above', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H1040 V160 C960 180 900 140 820 150 C720 160 680 220 580 210 C480 200 420 140 320 160 C220 180 140 240 0 220Z" />
        <Forest trees={trees} d="M0 768 V560 C80 540 160 600 220 680 C250 720 240 768 240 768Z" />
        <Forest trees={trees} d="M380 768 C400 680 500 640 560 670 C620 700 640 768 640 768Z" />
        <Forest trees={trees} d="M760 768 C780 700 880 680 940 700 C1000 720 1040 768 1040 768Z" />
        <Web x={370} y={390} r={44} />
        <Web x={680} y={420} r={36} />
        <Web x={980} y={360} r={30} />
        <g fill="#141612">
          <ellipse cx="220" cy="420" rx="34" ry="12" />
          <ellipse cx="520" cy="380" rx="28" ry="10" />
          <ellipse cx="840" cy="440" rx="30" ry="11" />
        </g>
        <path d="M200 300 L560 290 M640 560 L980 470" stroke="#857052" strokeWidth="1.5" strokeDasharray="4 6" />
      </>
    ),
  },
  // 7. Отруєна стежка: bitter herbs, the hidden workshops of poison.
  7: {
    points: [
      [150, 620],
      [320, 480],
      [480, 610],
      [620, 430],
      [760, 560],
      [900, 300],
    ],
    labels: ['below', 'above', 'below', 'above', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H600 C560 120 440 180 360 260 C280 340 120 360 0 380Z" />
        <Forest trees={trees} d="M0 768 V700 C80 690 120 720 140 768Z" />
        <Forest trees={trees} d="M300 768 C320 690 420 680 440 720 C460 760 460 768 460 768Z" />
        <Forest trees={trees} d="M780 0 H1040 V200 C980 190 940 140 880 150 C820 160 800 60 780 0Z" />
        <Forest trees={trees} d="M1040 600 C980 620 940 700 960 768 H1040Z" />
        <Creek d="M0 520 C160 540 260 460 380 500 S560 560 640 520" />
        <Herbs x={300} y={540} />
        <Herbs x={350} y={560} />
        <Herbs x={620} y={500} />
        <Herbs x={660} y={470} />
        <Tent x={740} y={600} scale={0.9} />
        <Fire x={762} y={612} />
        <g transform="translate(860 330)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
          <rect x="0" y="-50" width="80" height="50" />
          <path d="M-8 -50 L40 -86 L88 -50Z" />
          <rect x="30" y="-30" width="18" height="30" fill="#5F7A3A" opacity=".6" />
        </g>
      </>
    ),
  },
  // 8. Чорне лігво: the main camp with its huts, stores and the inner lair.
  8: {
    points: [
      [140, 640],
      [300, 480],
      [460, 570],
      [600, 400],
      [740, 480],
      [880, 260],
    ],
    labels: ['below', 'above', 'below', 'above', 'below', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H460 C420 100 300 160 220 240 C160 300 60 320 0 340Z" />
        <Forest trees={trees} d="M0 768 V700 C60 690 100 720 120 768Z" />
        <Forest trees={trees} d="M1040 0 V160 C980 150 940 100 900 110 C840 120 800 40 780 0Z" />
        <Forest trees={trees} d="M1040 640 C980 650 940 720 960 768 H1040Z" />
        <ellipse cx="640" cy="440" rx="320" ry="190" fill="#262A1E" />
        <Palisade x={360} y={330} posts={8} />
        <Palisade x={780} y={620} posts={6} />
        <Tent x={420} y={560} />
        <Tent x={560} y={470} scale={0.9} />
        <Tent x={700} y={540} />
        <Fire x={620} y={520} />
        <g transform="translate(860 270)" fill="#2A1A16" stroke="#120F0C" strokeWidth="2">
          <rect x="-40" y="-40" width="90" height="40" />
          <path d="M-50 -40 L5 -80 L60 -40Z" />
        </g>
        <Banner x={900} y={190} />
      </>
    ),
  },
  // 9. Вороняча вежа: the posts of the archers and the tower on the rock.
  9: {
    points: [
      [160, 660],
      [320, 560],
      [460, 470],
      [600, 380],
      [740, 290],
      [860, 170],
    ],
    labels: ['below', 'below', 'below', 'below', 'below', 'left'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H360 C320 120 200 200 120 300 C70 360 20 380 0 380Z" />
        <Forest trees={trees} d="M0 768 V720 C60 700 120 730 140 768Z" />
        <Forest trees={trees} d="M360 768 C380 700 480 680 520 710 C560 740 560 768 560 768Z" />
        <Forest trees={trees} d="M640 768 C660 640 800 600 900 620 C980 640 1040 700 1040 700 V768Z" />
        <Rocks x={780} y={180} scale={1.6} />
        <Tower x={900} y={210} />
        <WatchPost x={330} y={540} />
        <WatchPost x={610} y={360} />
        <Ravens birds={[[880, 40], [940, 70], [980, 30], [820, 90]]} />
      </>
    ),
  },
  // 10. Гніздо Чорного Крука: rocks, old trees, underground passages and the nest.
  10: {
    points: [
      [120, 640],
      [260, 520],
      [400, 610],
      [520, 440],
      [660, 520],
      [760, 360],
      [880, 200],
    ],
    labels: ['below', 'above', 'below', 'above', 'below', 'left', 'below'],
    draw: ({ trees }) => (
      <>
        <Forest trees={trees} d="M0 0 H300 C260 120 180 200 100 260 C60 290 20 300 0 300Z" />
        <Forest trees={trees} d="M0 768 V720 C60 700 100 730 120 768Z" />
        <Forest trees={trees} d="M280 768 C300 700 380 690 420 720 C460 750 460 768 460 768Z" />
        <Rocks x={600} y={120} scale={2} />
        <Rocks x={820} y={300} scale={1.4} />
        <Rocks x={380} y={300} scale={0.9} />
        <g fill="#141210">
          <ellipse cx="520" cy="470" rx="26" ry="14" />
          <ellipse cx="760" cy="390" rx="24" ry="13" />
        </g>
        <g transform="translate(880 170)">
          <path d="M-50 0 C-30 -40 30 -40 50 0 Z" fill="#2A1A16" stroke="#120F0C" strokeWidth="2" />
          <path d="M-36 -6 l12 -10 M36 -6 l-12 -10 M0 -26 v-14" stroke="#120F0C" strokeWidth="3" />
        </g>
        <Ravens birds={[[840, 60], [900, 40], [960, 90], [780, 110], [1000, 50]]} />
      </>
    ),
  },
};

// «Чорний прапор»: the roads around the Sich, in the same coordinates (1040 × 768).
const STEPPE = '#3A3428';

/*
 * The road zigzags up to the camp of the leader in the top right corner. Every point is a hollow
 * with its label below or a rise with its label above, the hollows a step apart in height, so the
 * long names of the levels meet neither each other nor a marker, and the labels stay inside the
 * map down to the width of a small phone.
 */
const HOLLOWS: Pick<StageScene, 'points' | 'labels'> = {
  points: [
    [185, 540],
    [318, 330],
    [451, 450],
    [584, 270],
    [717, 540],
    [850, 210],
  ],
  labels: ['below', 'above', 'below', 'above', 'below', 'below'],
};

const RISES: Pick<StageScene, 'points' | 'labels'> = {
  points: [
    [185, 450],
    [318, 260],
    [451, 540],
    [584, 330],
    [717, 470],
    [850, 180],
  ],
  labels: ['below', 'above', 'below', 'above', 'below', 'below'],
};

const SLOPES: Pick<StageScene, 'points' | 'labels'> = {
  points: [
    [185, 500],
    [318, 300],
    [451, 410],
    [584, 240],
    [717, 500],
    [850, 190],
  ],
  labels: ['below', 'above', 'below', 'above', 'below', 'below'],
};

const HOLLOWS_ROAD =
  'M0 600 C80 590 140 560 185 540 C240 515 270 350 318 330 C370 310 400 440 451 450 C500 460 530 290 584 270 C640 250 670 520 717 540 C770 560 810 260 850 210';
const RISES_ROAD =
  'M0 480 C80 470 140 460 185 450 C240 438 270 280 318 260 C370 240 400 520 451 540 C500 558 530 350 584 330 C640 310 670 450 717 470 C770 490 810 230 850 180';
const SLOPES_ROAD =
  'M0 540 C80 530 140 515 185 500 C240 480 270 320 318 300 C370 280 400 400 451 410 C500 420 530 260 584 240 C640 220 670 480 717 500 C770 520 810 240 850 190';

// 1. Перші напади: the road, the broken cart, the hill of the ambush and the camp of the leader.
const ROADS_FIRST: StageScene = {
  ...HOLLOWS,
  ground: STEPPE,
  draw: () => (
    <>
      <Steppe />
      <Hill x={760} y={600}>
        <Bandit x={800} y={585} />
      </Hill>
      <Road d={HOLLOWS_ROAD} />
      <Cart x={380} y={350} broken />
      <Bandit x={500} y={440} />
      <Bandit x={522} y={446} />
      <Tent x={900} y={230} />
      <Fire x={930} y={248} />
      <Banner x={980} y={170} black />
    </>
  ),
};

const ROAD_SCENES: Readonly<Record<number, StageScene>> = {
  1: ROADS_FIRST,
  // 2. Розбійницькі ватаги: the watch on the road, the camp at the edge of the wood, the loot.
  2: {
    ...RISES,
    ground: STEPPE,
    draw: ({ trees }) => (
      <>
        <Steppe />
        <Forest trees={trees} d="M0 0 H260 C230 70 170 120 100 140 C60 150 20 150 0 150Z" />
        <Hill x={850} y={210} />
        <Road d={RISES_ROAD} />
        <WatchPost x={100} y={470} />
        <Tent x={370} y={280} scale={0.8} />
        <Fire x={440} y={290} />
        <Bandit x={500} y={530} />
        <Bandit x={522} y={536} />
        <Chests x={640} y={340} />
        <Palisade x={740} y={220} posts={3} />
        <Palisade x={900} y={220} posts={3} />
        <Banner x={930} y={130} black />
      </>
    ),
  },
  // 3. Чорні здирники: the robbed village, the point of the tribute, the caravan and the yard.
  3: {
    ...SLOPES,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Road d={SLOPES_ROAD} />
        <Hut x={80} y={490} />
        <Hut x={100} y={410} />
        <Cart x={380} y={320} />
        <WatchPost x={500} y={420} />
        <Cart x={650} y={260} />
        <Palisade x={770} y={500} posts={4} />
        <Hut x={910} y={210} />
        <Banner x={950} y={140} black />
      </>
    ),
  },
  // 4. Залізний заслін: the stakes across the road, the wall of shields and the post.
  4: {
    ...HOLLOWS,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Hill x={850} y={240} />
        <Road d={`${HOLLOWS_ROAD} C880 150 960 110 1040 100`} />
        <Barricade x={230} y={480} stakes={2} />
        <WatchPost x={370} y={350} />
        <Barricade x={490} y={420} />
        <Shields x={630} y={300} count={4} />
        <Palisade x={770} y={540} posts={4} />
        <Palisade x={740} y={250} posts={3} />
        <Palisade x={900} y={250} posts={3} />
        <Banner x={930} y={160} black />
      </>
    ),
  },
  // 5. Табір Чорного прапора: the camp of the band, its yard of drills and its stores.
  5: {
    ...RISES,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Hill x={860} y={210} />
        <Palisade x={40} y={380} posts={6} />
        <ellipse cx="451" cy="560" rx="70" ry="24" fill="#5A4C34" />
        <Road d={RISES_ROAD} />
        <WatchPost x={110} y={470} />
        <Tent x={360} y={270} />
        <Tent x={200} y={330} scale={0.8} />
        <Fire x={520} y={520} />
        <Chests x={640} y={340} />
        <Tent x={770} y={480} />
        <Banner x={800} y={420} black />
        <Tent x={890} y={200} scale={1.2} />
        <Banner x={980} y={130} black />
      </>
    ),
  },
  // 6. Кривава дорога: the caravan, the stakes, the crossing of the river and the ambush.
  6: {
    ...SLOPES,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Creek wide d="M520 0 C560 100 570 180 584 240 S600 420 560 560 S520 700 540 768" />
        <Road d={`${SLOPES_ROAD} C880 140 960 110 1040 100`} />
        <Cart x={160} y={330} />
        <Bandit x={380} y={300} />
        <Bandit x={400} y={306} />
        <Barricade x={490} y={400} stakes={2} />
        <Rocks x={700} y={380} scale={0.4} />
        <Bandit x={780} y={480} />
        <Bandit x={802} y={486} />
        <Bandit x={824} y={482} />
        <Tent x={900} y={210} />
        <Banner x={950} y={140} black />
      </>
    ),
  },
  // 7. Чорні головорізи: the rocks, the guard, the armoured band and its fortified camp.
  7: {
    ...HOLLOWS,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Rocks x={40} y={400} scale={0.6} />
        <Rocks x={230} y={180} scale={0.5} />
        <Rocks x={620} y={600} scale={0.5} />
        <Rocks x={960} y={400} scale={0.6} />
        <Road d={HOLLOWS_ROAD} />
        <Bandit x={370} y={350} />
        <Bandit x={392} y={356} />
        <Bandit x={500} y={440} />
        <Bandit x={522} y={446} />
        <Bandit x={544} y={442} />
        <Shields x={630} y={300} count={3} />
        <Palisade x={770} y={540} posts={4} />
        <Palisade x={720} y={200} posts={2} />
        <Tent x={900} y={230} />
        <Fire x={950} y={248} />
        <Banner x={980} y={160} black />
      </>
    ),
  },
  // 8. Велика ватага: the walls of the main camp, its yard and the tent of the command.
  8: {
    ...RISES,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Road d={RISES_ROAD} />
        <Palisade x={60} y={470} posts={4} />
        <Shields x={370} y={270} count={3} />
        <Palisade x={500} y={540} posts={4} />
        <Hut x={670} y={350} />
        <Fire x={620} y={420} />
        <Tent x={770} y={480} scale={1.2} />
        <Banner x={840} y={430} black />
        <Tower x={900} y={220} />
        <Banner x={960} y={80} black />
      </>
    ),
  },
  // 9. Останній рубіж: the trail of the retreat, the last guard and the chambers of the leader.
  9: {
    ...SLOPES,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Rocks x={60} y={420} scale={0.6} />
        <Road d={SLOPES_ROAD} />
        <WatchPost x={370} y={320} />
        <Palisade x={500} y={420} posts={3} />
        <Barricade x={630} y={260} stakes={2} />
        <Hut x={790} y={500} />
        <Tower x={900} y={230} />
        <Banner x={960} y={90} black />
      </>
    ),
  },
  // 10. Король розбійників: the last fortress, its gate, the iron hall and the throne yard.
  10: {
    ...HOLLOWS,
    ground: STEPPE,
    draw: () => (
      <>
        <Steppe />
        <Rocks x={60} y={440} scale={0.6} />
        <ellipse cx="717" cy="556" rx="70" ry="22" fill="#5A4C34" />
        <Palisade x={760} y={160} posts={12} />
        <Tower x={724} y={190} />
        <Tower x={960} y={190} />
        <Banner x={1000} y={40} black />
        <Road d={HOLLOWS_ROAD} />
        <Palisade x={370} y={470} posts={3} />
        <path d="M492 410 V366 H536 V410" stroke="#3B2A1E" strokeWidth="8" fill="none" />
        <Palisade x={540} y={420} posts={2} />
        <g fill="#2A2420" stroke="#120F0C" strokeWidth="2">
          <rect x="630" y="270" width="70" height="36" />
          <path d="M622 270 L665 248 L708 270Z" />
        </g>
      </>
    ),
  },
};
