import type { KingStage } from '../../../domain/kozak/duel';
import { useSvgId } from './svgId';

/*
 * §24.9: the King of robbers as the duel leaves him. Silhouettes in the palette of the game that an
 * illustrator replaces with drawings: the crown, the fur cloak and the heavy saber, worse for wear
 * with every quarter of his health gone.
 */

const INK = '#0D0909';
const GOLD = '#C9A24A';
const BLOOD = '#B4372C';

// Each stage: the colours behind the King, how low he stands and how the saber is held.
const STAGES: Readonly<Record<KingStage, { readonly sky: readonly [string, string]; readonly drop: number; readonly saber: string }>> = {
  unbroken: { sky: ['#7A3A24', '#1A1213'], drop: 0, saber: 'M206 120 L246 54' },
  wounded: { sky: ['#6A2C22', '#161011'], drop: 6, saber: 'M206 124 L250 70' },
  enraged: { sky: ['#8E2620', '#1A0C0C'], drop: 4, saber: 'M206 118 L268 100' },
  'last-breath': { sky: ['#4A2420', '#120D0D'], drop: 34, saber: 'M206 150 L222 190' },
  defeated: { sky: ['#3A2A22', '#100C0C'], drop: 0, saber: '' },
};

export function KingPortrait({ stage, label, className = 'k-portrait' }: { stage: KingStage; label: string; className?: string }) {
  const id = useSvgId('king');
  const { sky, drop, saber } = STAGES[stage];

  return (
    <svg className={className} viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <radialGradient id={id('bg')} cx=".5" cy=".7" r=".8">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </radialGradient>
      </defs>
      <rect width="340" height="190" fill={`url(#${id('bg')})`} />
      <path d="M0 190 V160 Q170 140 340 160 V190Z" fill="#1A1010" />
      {stage === 'defeated' ? (
        <g>
          {/* The crown in the dust and the saber broken in two */}
          <path d="M120 172 l8 -16 l9 10 l9 -14 l9 14 l9 -10 l8 16z" fill={GOLD} opacity=".8" />
          <path d="M186 176 L236 166 M244 168 L280 176" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M60 182 C100 168 150 170 170 182Z" fill={INK} />
        </g>
      ) : (
        <g transform={`translate(0 ${drop})`}>
          {/* The fur cloak, the head and the crown */}
          <path d="M126 190 C124 140 140 118 156 110 C144 98 144 74 170 66 C196 74 196 98 184 110 C200 118 216 140 214 190Z" fill={INK} />
          <path d={stage === 'last-breath' ? 'M150 62 l6 -12 l7 8 l7 -10 l7 10 l7 -8 l6 12z' : 'M152 66 l5 -14 l6 9 l7 -12 l7 12 l6 -9 l5 14z'} fill={GOLD} transform={stage === 'wounded' ? 'rotate(-8 170 60)' : undefined} />
          <path d={saber} stroke={INK} strokeWidth="6" strokeLinecap="round" />
          {stage !== 'unbroken' && <path d="M150 128 l14 10 M178 120 l-10 16 M190 146 l-14 6" stroke="#5A4A44" strokeWidth="2" />}
          {stage !== 'unbroken' && <path d="M162 146 q6 6 2 14" stroke={BLOOD} strokeWidth="3" fill="none" />}
          {stage === 'enraged' && <path d="M160 86 h8 M174 86 h8" stroke="#E0685C" strokeWidth="2.5" strokeLinecap="round" />}
        </g>
      )}
    </svg>
  );
}

// The legendary trophy of the one who defeated the King: his curved saber with a golden hilt.
export function SaberTrophy({ label, className = 'k-trophy' }: { label: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={label}>
      <path d="M14 50 C26 46 44 30 52 10 C48 30 34 46 18 54Z" fill="#D8D2C4" stroke="#8A8478" strokeWidth="1.5" />
      <path d="M10 46 L22 58" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <path d="M8 56 L14 50" stroke="#6B4A2A" strokeWidth="5" strokeLinecap="round" />
      <circle cx="7" cy="57" r="2.5" fill={GOLD} />
    </svg>
  );
}
