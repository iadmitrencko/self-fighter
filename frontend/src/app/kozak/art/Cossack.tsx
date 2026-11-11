import type { Look } from '../../../domain/kozak/ranks';
import { useSvgId } from './svgId';

/**
 * §24.2: the cossack as his rank dresses him. Layered silhouettes in the palette of the game;
 * the final drawings come from an illustrator (section 6 of kozak_design/DESIGN_SPEC.md).
 */
export function CossackFigure({ look, label }: { look: Look; label: string }) {
  const id = useSvgId('cossack');
  const rich = look === 'officer' || look === 'general' || look === 'hetman';
  const coat = COATS[look];

  return (
    // A box of another shape crops the scene around the figure instead of leaving empty bands.
    <svg className="k-figure" viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2420" />
          <stop offset=".62" stopColor={look === 'hetman' ? '#5A3324' : '#3F4734'} />
          <stop offset="1" stopColor={look === 'hetman' ? '#9A5A34' : '#7A6A42'} />
        </linearGradient>
        <radialGradient id={id('glow')} cx=".5" cy=".42" r=".55">
          <stop offset="0" stopColor="#F1D58A" stopOpacity=".42" />
          <stop offset="1" stopColor="#F1D58A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".7" stopColor="#121416" stopOpacity="0" />
          <stop offset="1" stopColor="#121416" stopOpacity=".85" />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id('sky')})`} />
      <rect width="240" height="320" fill={`url(#${id('glow')})`} />
      {/* The palisade of the Sich on the horizon */}
      <path
        d="M0 236 V206 l6 -8 l6 8 v-4 l6 -8 l6 8 v4 l6 -8 l6 8 v-2 l6 -8 l6 8 v40 Z M168 236 V204 l6 -8 l6 8 v-2 l6 -8 l6 8 v2 l6 -8 l6 8 v-4 l6 -8 l6 8 l6 -8 l6 8 v32 Z"
        fill="#24302A"
      />
      <path d="M0 250 Q60 228 120 238 T240 244 V320 H0Z" fill="#1E2A23" />
      {look === 'hetman' && <Bunchuk />}
      {rich && <Cloak color={look === 'officer' ? '#2A1B16' : '#1C1414'} />}
      <Legs trousers={coat.trousers} />
      <Body coat={coat} look={look} />
      <Head look={look} />
      <Gear look={look} />
      <path d="M0 292 Q120 280 240 292 V320 H0Z" fill="#141A16" />
      <rect width="240" height="320" fill={`url(#${id('fade')})`} />
    </svg>
  );
}

interface Coat {
  readonly coat: string;
  readonly trim: string | null;
  readonly sash: string;
  readonly trousers: string;
}

const COATS: Readonly<Record<Look, Coat>> = {
  recruit: { coat: '#CDBFA0', trim: null, sash: '#7A6248', trousers: '#2E3C44' },
  cossack: { coat: '#2F5B45', trim: null, sash: '#8E2620', trousers: '#2A3F4C' },
  officer: { coat: '#5C1F1A', trim: '#C9A24A', sash: '#C9A24A', trousers: '#24343F' },
  general: { coat: '#3B2346', trim: '#E2C27A', sash: '#8E2620', trousers: '#1F2A35' },
  hetman: { coat: '#8E2620', trim: '#F1DDA2', sash: '#E2C27A', trousers: '#1E2A33' },
};

const SKIN = '#C59A70';
const HAIR = '#16110D';
const BOOT = '#2B1E15';

function Legs({ trousers }: { trousers: string }) {
  return (
    <g>
      {/* Wide sharovary, tucked into the boots */}
      <path d="M90 176 C80 212 84 250 98 268 H117 L120 216 L123 268 H142 C156 250 160 212 150 176 Z" fill={trousers} />
      <path d="M120 200 V264" stroke="#000" strokeOpacity=".25" strokeWidth="2" />
      <path d="M97 266 H117 V290 Q117 296 110 296 H90 Q86 296 88 291 Q92 286 97 284 Z" fill={BOOT} />
      <path d="M123 266 H143 V284 Q148 286 152 291 Q154 296 150 296 H130 Q123 296 123 290 Z" fill={BOOT} />
    </g>
  );
}

function Body({ coat, look }: { coat: Coat; look: Look }) {
  const long = look !== 'recruit';

  return (
    <g>
      {/* A shirt for the dzhura, a zhupan or a kuntush that reaches the knees for the rest */}
      <path
        d={
          long
            ? 'M95 104 C86 124 84 170 82 226 H158 C156 170 154 124 145 104 Q120 96 95 104 Z'
            : 'M95 104 C88 122 87 152 89 182 H151 C153 152 152 122 145 104 Q120 96 95 104 Z'
        }
        fill={coat.coat}
      />
      {long && <path d="M120 106 V226" stroke="#000" strokeOpacity=".28" strokeWidth="2" />}
      {coat.trim !== null && (
        <g stroke={coat.trim} strokeWidth="2.2" strokeLinecap="round">
          <path d="M109 122 H131 M108 132 H132 M108 142 H132 M109 152 H131" />
          <path d="M84 224 H156" strokeWidth="3" />
        </g>
      )}
      {look === 'recruit' && <path d="M112 104 L120 122 L128 104" fill="none" stroke="#9C8E72" strokeWidth="2" />}
      {/* The sash */}
      <path d="M88 166 H152 V180 H88 Z" fill={coat.sash} />
      {look !== 'recruit' && <path d="M140 178 L146 206 L138 206 L136 180 Z" fill={coat.sash} />}
      {/* Arms and hands */}
      <path d="M97 108 C84 122 80 150 82 178" fill="none" stroke={coat.coat} strokeWidth="14" strokeLinecap="round" />
      <path d="M143 108 C156 122 160 150 158 178" fill="none" stroke={coat.coat} strokeWidth="14" strokeLinecap="round" />
      <circle cx="82" cy="184" r="7" fill={SKIN} />
      <circle cx="158" cy="184" r="7" fill={SKIN} />
      {(look === 'general' || look === 'hetman') && (
        <path d="M95 106 Q120 118 145 106 Q140 96 120 96 Q100 96 95 106 Z" fill="#4A3A2C" />
      )}
    </g>
  );
}

function Head({ look }: { look: Look }) {
  return (
    <g>
      <rect x="113" y="92" width="14" height="12" rx="3" fill={SKIN} />
      <ellipse cx="120" cy="78" rx="15" ry="17" fill={SKIN} />
      {look === 'recruit' ? (
        // The shaved head with the oseledets lock of a young cossack.
        <path d="M121 61 C107 58 98 70 103 85 C105 75 111 67 121 65 Z" fill={HAIR} />
      ) : (
        <Hat look={look} />
      )}
      {/* Long moustache */}
      <path
        d="M111 87 C114 85 118 86 120 88 C122 86 126 85 129 87 C133 91 137 99 135 103 C131 97 126 92 120 91 C114 92 109 97 105 103 C103 99 107 91 111 87 Z"
        fill={HAIR}
      />
      <path d="M113 78 H117 M123 78 H127" stroke="#2A1D14" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Hat({ look }: { look: Look }) {
  const top = look === 'cossack' ? '#2A2622' : look === 'officer' ? '#8E2620' : look === 'general' ? '#3B2346' : '#8E2620';

  return (
    <g>
      {/* A fur hat; the officers wear it with a hanging shlyk */}
      <path d="M102 70 C102 54 138 54 138 70 Z" fill={top} />
      <path d="M100 66 H140 V74 Q120 78 100 74 Z" fill="#3A2C22" />
      {look !== 'cossack' && <path d="M136 60 C148 62 152 74 146 84 C144 76 140 68 132 64 Z" fill={top} />}
      {(look === 'general' || look === 'hetman') && (
        <g>
          {/* A jewel with a plume of feathers */}
          <path d="M118 62 C114 48 116 38 124 30 C122 42 124 52 122 62 Z" fill="#E9DEC3" />
          <circle cx="120" cy="64" r="3.4" fill={look === 'hetman' ? '#E0685C' : '#5FA3B8'} stroke="#F1DDA2" strokeWidth="1.4" />
        </g>
      )}
    </g>
  );
}

function Gear({ look }: { look: Look }) {
  switch (look) {
    case 'recruit':
      // A wooden staff.
      return <path d="M164 120 L156 296" stroke="#6E5038" strokeWidth="5" strokeLinecap="round" />;
    case 'cossack':
      return (
        <g>
          <Saber hilt="#C9A24A" />
          {/* A shoulder plate */}
          <path d="M88 104 Q96 96 108 102 L104 116 Q94 114 88 104 Z" fill="#8C9092" />
        </g>
      );
    case 'officer':
      return (
        <g>
          <Saber hilt="#E2C27A" />
          {/* A pernach in the hand of the officer */}
          <path d="M158 186 L170 132" stroke="#3B2A1E" strokeWidth="4" strokeLinecap="round" />
          <path d="M166 120 l8 4 l2 9 l-6 5 l-8 -3 l-2 -9 z" fill="#C9A24A" />
        </g>
      );
    case 'general':
      return (
        <g>
          <Saber hilt="#F1DDA2" gems />
          <circle cx="106" cy="128" r="3" fill="#5FA3B8" stroke="#F1DDA2" strokeWidth="1.2" />
          <circle cx="134" cy="128" r="3" fill="#E0685C" stroke="#F1DDA2" strokeWidth="1.2" />
        </g>
      );
    case 'hetman':
      return (
        <g>
          <Saber hilt="#F1DDA2" gems />
          {/* The bulava, the mace of the hetman */}
          <path d="M158 186 L174 118" stroke="#C9A24A" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="176" cy="110" r="10" fill="#E2C27A" stroke="#8F7333" strokeWidth="2" />
          <circle cx="176" cy="110" r="3" fill="#E0685C" />
        </g>
      );
  }
}

function Saber({ hilt, gems = false }: { hilt: string; gems?: boolean }) {
  return (
    <g>
      <path d="M92 176 C80 206 76 232 82 262" fill="none" stroke="#1A1612" strokeWidth="6" strokeLinecap="round" />
      <path d="M86 166 L96 182" stroke={hilt} strokeWidth="5" strokeLinecap="round" />
      {gems && <circle cx="90" cy="172" r="2.6" fill="#E0685C" />}
    </g>
  );
}

function Cloak({ color }: { color: string }) {
  return <path d="M92 104 C70 150 64 220 70 276 H170 C176 220 170 150 148 104 Q120 92 92 104 Z" fill={color} />;
}

// The bunchuk: a horse-tail standard of the hetman with a golden ball.
function Bunchuk() {
  return (
    <g>
      <path d="M48 300 V44" stroke="#3B2A1E" strokeWidth="4" />
      <circle cx="48" cy="40" r="7" fill="#E2C27A" />
      <path d="M48 48 C34 70 32 100 40 124 C44 110 46 96 48 84 C50 96 52 110 56 124 C64 100 62 70 48 48 Z" fill="#E9DEC3" />
    </g>
  );
}
