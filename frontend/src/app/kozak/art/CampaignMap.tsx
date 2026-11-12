import type { CSSProperties, ReactNode } from 'react';
import type { CampaignId } from '../../../domain/kozak/journey';
import { useSvgId } from './svgId';

/*
 * Screen 2 of kozak_design: the map of a campaign. The wide map runs from the start of the route
 * on the left to its end on the right, the tall one of a phone from the bottom up. The route of
 * «Лісові круки» leads from the edge of the forest to the Nest, the route of «Чорний прапор» from
 * the Sich along the roads to the fortress of the king. Coordinates come from the mockups.
 */

type Point = readonly [x: number, y: number];
export type LabelSide = 'above' | 'below' | 'left' | 'right';

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly points: readonly Point[];
  // The curve from each point to the next one.
  readonly segments: readonly string[];
  readonly labels: readonly LabelSide[];
  // The longer label of the current point, where it meets no other label.
  readonly currentLabels: readonly LabelSide[];
}

export const WIDE: MapLayout = {
  width: 1440,
  height: 768,
  points: [
    [150, 640],
    [320, 560],
    [480, 620],
    [610, 470],
    [770, 530],
    [900, 380],
    [1050, 460],
    [1140, 290],
    [1250, 190],
    [1340, 100],
  ],
  segments: [
    'C220 620 260 580 320 560',
    'C400 540 420 610 480 620',
    'C560 620 580 520 610 470',
    'C680 470 720 520 770 530',
    'C840 540 850 420 900 380',
    'C960 340 1000 450 1050 460',
    'C1110 470 1100 330 1140 290',
    'C1180 250 1210 210 1250 190',
    'C1290 170 1310 130 1340 100',
  ],
  // The Nest is labelled on its left, away from the tower below it.
  labels: ['below', 'above', 'below', 'above', 'below', 'below', 'below', 'below', 'below', 'left'],
  currentLabels: ['above', 'above', 'below', 'above', 'left', 'above', 'below', 'left', 'left', 'left'],
};

export const TALL: MapLayout = {
  width: 390,
  height: 1000,
  points: [
    [90, 930],
    [260, 860],
    [120, 770],
    [280, 680],
    [150, 590],
    [280, 500],
    [110, 410],
    [270, 320],
    [130, 220],
    [230, 100],
  ],
  segments: [
    'C160 920 220 890 260 860',
    'C280 820 160 800 120 770',
    'C90 740 240 710 280 680',
    'C300 640 180 620 150 590',
    'C130 560 250 530 280 500',
    'C300 460 140 440 110 410',
    'C90 380 240 350 270 320',
    'C290 280 150 250 130 220',
    'C120 180 210 130 230 100',
  ],
  labels: ['right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'below'],
  currentLabels: ['right', 'left', 'right', 'left', 'right', 'left', 'right', 'left', 'right', 'below'],
};

// The route from the first point through the given one.
export function routeTo(layout: MapLayout, last: number): string {
  const [start] = layout.points;

  return `M${start?.[0] ?? 0} ${start?.[1] ?? 0} ${layout.segments.slice(0, last).join(' ')}`;
}

// The rest of the route, from the given point on.
export function routeFrom(layout: MapLayout, first: number): string {
  const point = layout.points[first];

  return `M${point?.[0] ?? 0} ${point?.[1] ?? 0} ${layout.segments.slice(first).join(' ')}`;
}

// A point of the map in shares of its size, so markers keep their size on any screen.
export function pinStyle(layout: MapLayout, index: number): CSSProperties {
  const [x, y] = layout.points[index] ?? [0, 0];

  return { left: `${(x / layout.width) * 100}%`, top: `${(y / layout.height) * 100}%` };
}

// A point of a map that covers its box: the styles scale it as the picture is scaled.
export function pinVars(layout: MapLayout, index: number): CSSProperties {
  const [x, y] = layout.points[index] ?? [0, 0];

  return { '--x': x, '--y': y } as CSSProperties;
}

/**
 * The map behind the markers: the passed part of the route is gold, the rest a dashed line, and
 * the fog lies over everything ahead of the current point.
 */
export function CampaignMap({
  campaign,
  layout,
  current,
  label,
  children,
}: {
  campaign: CampaignId;
  layout: MapLayout;
  // The index of the point in progress; the length of the route once everything is passed.
  current: number;
  label: string;
  children: ReactNode;
}) {
  const id = useSvgId('map');
  const wide = layout === WIDE;
  const reached = Math.min(current, layout.points.length - 1);
  const [fogX, fogY] = layout.points[reached] ?? [0, 0];
  const passedAll = current >= layout.points.length;
  // The fog starts a little ahead of the current point and thickens towards the end of the route.
  const fogStart = wide ? Math.min(0.92, fogX / layout.width + 0.04) : Math.min(0.92, 1 - fogY / layout.height + 0.04);

  return (
    <div className={`k-map k-map--${wide ? 'wide' : 'tall'}`} style={{ aspectRatio: `${layout.width} / ${layout.height}` }}>
      <svg className="k-map__art" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={label}>
        <defs>
          <pattern id={id('trees')} width="30" height="26" patternUnits="userSpaceOnUse">
            <rect width="30" height="26" fill="#1A2A21" />
            <path d="M8 3 L14 17 H2Z M23 11 L29 25 H17Z" fill="#284235" />
            <path d="M8 3 L10.5 9 H5.5Z M23 11 L25.5 17 H20.5Z" fill="#355743" />
          </pattern>
          <pattern id={id('dark')} width="22" height="20" patternUnits="userSpaceOnUse">
            <rect width="22" height="20" fill="#142019" />
            <path d="M6 2 L11 14 H1Z M17 8 L21 19 H13Z" fill="#1F3529" />
          </pattern>
          <linearGradient id={id('fog')} x1={wide ? 0 : 0} y1={wide ? 0 : 1} x2={wide ? 1 : 0} y2={wide ? 0 : 0}>
            <stop offset={fogStart} stopColor="#0B0D0E" stopOpacity="0" />
            <stop offset={Math.min(0.97, fogStart + 0.18)} stopColor="#0B0D0E" stopOpacity=".45" />
            <stop offset="1" stopColor="#0B0D0E" stopOpacity=".72" />
          </linearGradient>
          <radialGradient id={id('vignette')} cx=".5" cy=".5" r=".75">
            <stop offset=".6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".55" />
          </radialGradient>
        </defs>
        {campaign === 'black-flag' ? (
          wide ? (
            <RoadsWide trees={id('trees')} />
          ) : (
            <RoadsTall />
          )
        ) : wide ? (
          <WideLand trees={id('trees')} dark={id('dark')} />
        ) : (
          <TallLand trees={id('trees')} />
        )}
        <path d={routeTo(layout, reached)} className="k-route k-route--passed" />
        {!passedAll && <path d={routeFrom(layout, reached)} className="k-route k-route--ahead" />}
        {!passedAll && <rect width={layout.width} height={layout.height} fill={`url(#${id('fog')})`} />}
        {wide && <rect width={layout.width} height={layout.height} fill={`url(#${id('vignette')})`} />}
      </svg>
      {children}
    </div>
  );
}

function WideLand({ trees, dark }: { trees: string; dark: string }) {
  return (
    <g>
      <rect width="1440" height="768" fill="#2A2C22" />
      <path d="M0 0 H560 C520 120 420 160 380 260 C340 360 200 380 120 470 C80 520 40 520 0 540Z" fill={`url(#${trees})`} />
      <path d="M0 768 V700 C80 690 120 720 60 768Z" fill={`url(#${trees})`} />
      <path d="M220 700 C300 640 420 700 380 768 H200Z" fill={`url(#${trees})`} />
      <path d="M380 420 C460 380 560 380 560 430 C540 520 440 540 380 520 C340 490 340 450 380 420Z" fill={`url(#${trees})`} />
      <path d="M540 768 C560 640 640 600 660 660 C680 720 640 768 640 768Z" fill={`url(#${trees})`} />
      <path d="M880 768 C900 640 980 560 1080 560 C1200 560 1260 620 1440 600 V768Z" fill={`url(#${dark})`} />
      <path d="M960 0 H1180 C1150 80 1080 140 1020 230 C990 280 930 300 900 260 C880 200 940 120 960 0Z" fill={`url(#${dark})`} />
      <path d="M1050 340 C1100 320 1200 360 1200 420 C1190 480 1120 500 1080 480 C1030 450 1010 380 1050 340Z" fill={`url(#${dark})`} />
      <ellipse cx="480" cy="620" rx="90" ry="50" fill="#363A2B" />
      <ellipse cx="300" cy="560" rx="70" ry="40" fill="#33372A" />
      <g fill="#3B3E3E" stroke="#22262A" strokeWidth="2">
        <path d="M1270 160 L1300 110 L1330 130 L1370 70 L1410 120 L1440 100 V230 L1380 240 L1320 220Z" />
        <path d="M1180 240 L1210 210 L1240 230 L1230 260 L1190 262Z" />
        <path d="M1300 40 L1330 10 L1360 30 L1350 60Z" />
      </g>
      <path d="M860 0 C820 160 920 300 800 420 S720 620 700 768" fill="none" stroke="#2E4652" strokeWidth="30" strokeLinecap="round" />
      <path d="M860 0 C820 160 920 300 800 420 S720 620 700 768" fill="none" stroke="#3E5866" strokeWidth="18" />
      <path d="M860 0 C820 160 920 300 800 420 S720 620 700 768" fill="none" stroke="#5B7A88" strokeWidth="2" strokeDasharray="10 18" opacity=".6" />
      <path d="M0 640 C60 650 100 640 150 640 C220 640 260 590 320 560 M480 620 C540 560 580 520 610 470 C680 480 720 520 770 530" fill="none" stroke="#6E5C40" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
      <g transform="translate(770 530) rotate(-12)">
        <rect x="-34" y="-9" width="68" height="18" fill="#5A4130" />
        <path d="M-34 -9 H34 M-34 9 H34" stroke="#2E2118" strokeWidth="3" />
        <path d="M-24 -9 V9 M-12 -9 V9 M0 -9 V9 M12 -9 V9 M24 -9 V9" stroke="#3B2A1E" strokeWidth="2" />
      </g>
      <g transform="translate(610 470)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
        <path d="M-58 -10 l6 -14 l6 14 M-46 -10 l6 -14 l6 14 M-34 -10 l6 -14 l6 14" />
        <rect x="-58" y="-10" width="36" height="22" />
        <rect x="24" y="-12" width="34" height="24" />
        <path d="M24 -12 l6 -14 l6 14 M36 -12 l6 -14 l6 14 M46 -12 l6 -14 l6 14" />
      </g>
      <g transform="translate(1250 190)" fill="#2A2420" stroke="#120F0C" strokeWidth="2">
        <rect x="30" y="-70" width="22" height="70" />
        <path d="M24 -70 L41 -96 L58 -70Z" />
      </g>
      <g fill="#0E1210">
        <path d="M1300 50 q8 -8 16 -1 q8 -7 16 1 q-8 -3 -16 4 q-8 -7 -16 -4z" />
        <path d="M1370 40 q6 -6 12 -1 q6 -5 12 1 q-6 -2 -12 3 q-6 -5 -12 -3z" />
        <path d="M1390 150 q6 -6 12 -1 q6 -5 12 1 q-6 -2 -12 3 q-6 -5 -12 -3z" />
      </g>
      <g stroke="#6B5A40" strokeWidth="1.5" fill="none" opacity=".7" transform="translate(900 380)">
        <circle r="40" />
        <circle r="26" />
        <path d="M-44 0 H44 M0 -44 V44 M-30 -30 L30 30 M30 -30 L-30 30" />
      </g>
    </g>
  );
}

function TallLand({ trees }: { trees: string }) {
  return (
    <g>
      <rect width="390" height="1000" fill="#2A2C22" />
      <path d="M0 1000 V860 C30 840 40 800 20 760 C0 720 0 700 0 700Z M390 1000 V900 C350 920 340 960 360 1000Z" fill={`url(#${trees})`} />
      <path d="M0 0 V520 C60 500 70 440 40 380 C20 320 70 260 60 180 C50 100 90 40 70 0Z" fill={`url(#${trees})`} />
      <path d="M390 0 V540 C330 520 320 460 350 400 C380 340 330 280 340 200 C350 140 320 60 330 0Z" fill={`url(#${trees})`} />
      <path d="M180 820 C220 790 260 800 250 760 C240 720 180 730 170 770Z" fill={`url(#${trees})`} />
      <path d="M190 470 C230 440 220 400 200 380 C170 360 150 400 160 440Z" fill={`url(#${trees})`} />
      <g fill="#3B3E3E" stroke="#22262A" strokeWidth="2">
        <path d="M160 130 L190 70 L220 90 L250 40 L290 90 L300 140 L250 150Z" />
        <path d="M40 250 L60 220 L84 236 L76 262 L44 264Z" />
      </g>
      <path d="M-10 600 C80 560 160 620 230 590 S340 560 400 590" fill="none" stroke="#2E4652" strokeWidth="26" />
      <path d="M-10 600 C80 560 160 620 230 590 S340 560 400 590" fill="none" stroke="#3E5866" strokeWidth="15" />
      <g transform="translate(150 595) rotate(80)">
        <rect x="-26" y="-8" width="52" height="16" fill="#5A4130" />
        <path d="M-18 -8 V8 M-8 -8 V8 M2 -8 V8 M12 -8 V8" stroke="#3B2A1E" strokeWidth="2" />
      </g>
      <g transform="translate(320 690)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.2">
        <rect x="-20" y="-8" width="40" height="16" />
        <path d="M-20 -8 l5 -10 l5 10 M-10 -8 l5 -10 l5 10 M0 -8 l5 -10 l5 10 M10 -8 l5 -10 l5 10" />
      </g>
      <g stroke="#6B5A40" strokeWidth="1.2" fill="none" opacity=".7" transform="translate(280 500)">
        <circle r="34" />
        <circle r="22" />
        <path d="M-36 0 H36 M0 -36 V36 M-25 -25 L25 25 M25 -25 L-25 25" />
      </g>
      <g transform="translate(160 220)" fill="#2A2420" stroke="#120F0C" strokeWidth="1.5">
        <rect x="0" y="-56" width="16" height="56" />
        <path d="M-5 -56 L8 -76 L21 -56Z" />
      </g>
      <g fill="#0E1210">
        <path d="M200 40 q6 -6 12 -1 q6 -5 12 1 q-6 -2 -12 3 q-6 -5 -12 -3z" />
        <path d="M260 24 q5 -5 10 -1 q5 -4 10 1 q-5 -2 -10 2 q-5 -4 -10 -2z" />
      </g>
      <path d="M90 1000 L90 930" stroke="#6E5C40" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
    </g>
  );
}

// «Чорний прапор»: the steppe around the Sich, its roads, villages, camps and the river.
const PALISADE = 'M0 0 v-30 l6 -10 l6 10 v30 M14 0 v-30 l6 -10 l6 10 v30 M28 0 v-30 l6 -10 l6 10 v30';

function Stakes({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 0 l14 -22 M14 0 l-14 -22 M20 0 l14 -22 M34 0 l-14 -22 M-4 -11 H38"
      stroke="#3B2A1E"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function Huts({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#1E1610" strokeWidth="1.5">
      <rect x="-16" y="-18" width="32" height="18" fill="#6B5A44" />
      <path d="M-21 -17 L0 -34 L21 -17Z" fill="#4A3A26" />
      <rect x="22" y="-14" width="26" height="14" fill="#6B5A44" />
      <path d="M18 -13 L35 -26 L52 -13Z" fill="#4A3A26" />
    </g>
  );
}

function Camp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L16 -24 L32 0Z M40 0 L54 -20 L68 0Z" fill="#5A4130" stroke="#2E2118" strokeWidth="1.5" />
      <path d="M30 4 l4 -8 l3 6 l3 -9 l3 11Z" fill="#E08A3C" />
    </g>
  );
}

function BlackFlag({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0 0 V-34 M0 -34 l22 6 l-22 9"
      stroke="#0E0C0B"
      strokeWidth="3"
      fill="#0E0C0B"
    />
  );
}

function RoadsWide({ trees }: { trees: string }) {
  const road = `M40 720 C90 700 130 670 150 640 ${WIDE.segments.join(' ')}`;

  return (
    <g>
      <rect width="1440" height="768" fill="#3A3428" />
      <path d="M0 0 H1440 V150 C1300 190 1160 140 1000 170 C820 200 640 150 460 180 C300 206 140 170 0 190Z" fill="#332E22" />
      <ellipse cx="300" cy="420" rx="260" ry="90" fill="#423A29" />
      <ellipse cx="980" cy="660" rx="320" ry="100" fill="#423A29" />
      <ellipse cx="1260" cy="400" rx="160" ry="70" fill="#423A29" />
      <path d="M0 0 H380 C350 80 280 130 200 180 C130 222 50 236 0 240Z" fill={`url(#${trees})`} />
      <path d={road} fill="none" stroke="#6E5C40" strokeWidth="14" strokeLinecap="round" opacity=".45" />
      <path d="M1030 0 C990 140 1000 260 900 380 S800 600 830 768" fill="none" stroke="#2E4652" strokeWidth="30" strokeLinecap="round" />
      <path d="M1030 0 C990 140 1000 260 900 380 S800 600 830 768" fill="none" stroke="#3E5866" strokeWidth="18" />
      <g transform="translate(20 740)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
        <path d={PALISADE} />
      </g>
      <path d="M60 700 l6 -30 M66 670 l22 6 l-22 8" stroke="#8E2620" strokeWidth="3" fill="#8E2620" />
      <Camp x={250} y={500} />
      <Huts x={400} y={620} />
      <Huts x={540} y={680} />
      <Stakes x={560} y={450} />
      <Camp x={690} y={610} />
      <Camp x={810} y={600} />
      <BlackFlag x={870} y={590} />
      <g fill="#3B3E3E" stroke="#22262A" strokeWidth="2">
        <path d="M1070 540 L1090 506 L1110 520 L1130 494 L1160 530 L1150 552 L1090 556Z" />
        <path d="M980 470 L996 450 L1012 462 L1004 480Z" />
      </g>
      <g transform="translate(1160 300)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
        <path d={PALISADE} />
      </g>
      <Camp x={1080} y={280} />
      <g transform="translate(1180 220)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
        <path d={PALISADE} />
      </g>
      <g transform="translate(1372 130)" fill="#2A2420" stroke="#120F0C" strokeWidth="2">
        <rect x="0" y="-80" width="28" height="80" />
        <path d="M-6 -80 L14 -108 L34 -80Z" />
      </g>
      <g transform="translate(1290 150)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.5">
        <path d={PALISADE} />
      </g>
      <BlackFlag x={1404} y={40} size={1.3} />
    </g>
  );
}

function RoadsTall() {
  const road = `M60 1000 C70 970 80 950 90 930 ${TALL.segments.join(' ')}`;

  return (
    <g>
      <rect width="390" height="1000" fill="#3A3428" />
      <ellipse cx="200" cy="820" rx="200" ry="70" fill="#423A29" />
      <ellipse cx="190" cy="360" rx="190" ry="80" fill="#423A29" />
      <path d="M0 0 H390 V90 C300 120 200 80 100 110 C60 120 20 116 0 110Z" fill="#332E22" />
      <path d={road} fill="none" stroke="#6E5C40" strokeWidth="12" strokeLinecap="round" opacity=".45" />
      <path d="M-10 540 C100 500 200 560 300 520 S380 500 400 510" fill="none" stroke="#2E4652" strokeWidth="26" />
      <path d="M-10 540 C100 500 200 560 300 520 S380 500 400 510" fill="none" stroke="#3E5866" strokeWidth="15" />
      <g transform="translate(150 996)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.2">
        <path d={PALISADE} />
      </g>
      <path d="M200 990 l5 -26 M205 964 l18 5 l-18 7" stroke="#8E2620" strokeWidth="3" fill="#8E2620" />
      <Huts x={30} y={800} />
      <Stakes x={322} y={700} />
      <Camp x={10} y={610} />
      <BlackFlag x={86} y={606} />
      <g fill="#3B3E3E" stroke="#22262A" strokeWidth="2">
        <path d="M14 440 L30 412 L46 424 L60 404 L76 434 L66 448 L24 450Z" />
      </g>
      <g transform="translate(316 340)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.2">
        <path d={PALISADE} />
      </g>
      <g transform="translate(20 240)" fill="#3B2A1E" stroke="#1E1610" strokeWidth="1.2">
        <path d={PALISADE} />
      </g>
      <g transform="translate(296 128)" fill="#2A2420" stroke="#120F0C" strokeWidth="1.5">
        <rect x="0" y="-60" width="20" height="60" />
        <path d="M-5 -60 L10 -82 L25 -60Z" />
      </g>
      <BlackFlag x={330} y={60} />
    </g>
  );
}
