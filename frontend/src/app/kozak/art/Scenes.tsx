import type { CampaignId } from '../../../domain/kozak/journey';
import { useSvgId } from './svgId';

/*
 * The scenes of kozak_design/screens. They are pictures, not styles: layered silhouettes in the
 * palette of the game that an illustrator replaces with drawings (DESIGN_SPEC.md, section 6).
 */

// A small flock of ravens: [x, y, size].
function Ravens({ birds, color = '#0E1210' }: { birds: readonly (readonly [number, number, number])[]; color?: string }) {
  return (
    <g fill={color}>
      {birds.map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y} q${s} -${s} ${2 * s} -${s / 8} q${s} -${(7 * s) / 8} ${2 * s} ${s / 8} q-${s} -${(3 * s) / 8} -${2 * s} ${s / 2} q-${s} -${(7 * s) / 8} -${2 * s} -${s / 2}z`}
        />
      ))}
    </g>
  );
}

// The picture of a campaign on its card. `crop` frames the middle for a small square.
export function CampaignArt({ campaign, label, crop = false }: { campaign: CampaignId; label: string; crop?: boolean }) {
  const id = useSvgId('campaign');
  const viewBox = crop ? CROPS[campaign] : '0 0 440 300';

  return (
    <svg className="k-art" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      {campaign === 'forest-ravens' && (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1E2B26" />
              <stop offset=".65" stopColor="#4B5A3E" />
              <stop offset="1" stopColor="#8B7444" />
            </linearGradient>
          </defs>
          <rect width="440" height="300" fill={`url(#${id('sky')})`} />
          <circle cx="300" cy="190" r="54" fill="#D8B868" opacity=".45" />
          <path d="M0 210 L22 160 L40 200 L66 140 L92 205 L118 150 L140 200 L170 130 L198 205 L226 160 L250 205 L280 150 L310 205 L340 155 L370 205 L400 145 L440 200 V300 H0Z" fill="#2D4337" />
          <rect x="318" y="96" width="24" height="112" fill="#17211C" />
          <path d="M308 98 L330 66 L352 98Z" fill="#17211C" />
          <rect x="312" y="108" width="36" height="7" fill="#17211C" />
          <path d="M0 250 L18 190 L38 240 L60 170 L86 250 L110 180 L136 250 L160 190 L188 255 L216 175 L244 255 L270 195 L300 255 L330 185 L360 255 L390 190 L420 255 L440 220 V300 H0Z" fill="#18241E" />
          <Ravens birds={[[150, 70, 8], [200, 46, 6], [118, 104, 5], [236, 90, 5], [258, 124, 4]]} />
          <path d="M0 300 V268 Q110 252 220 270 T440 262 V300Z" fill="#0F1512" />
        </>
      )}
      {campaign === 'black-flag' && (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1F1A1C" />
              <stop offset=".7" stopColor="#5A2A22" />
              <stop offset="1" stopColor="#8A4A2C" />
            </linearGradient>
          </defs>
          <rect width="440" height="300" fill={`url(#${id('sky')})`} />
          <path d="M0 230 Q120 170 230 190 T440 210 V300 H0Z" fill="#2A1E1C" />
          <rect x="226" y="70" width="5" height="128" fill="#0F0D0E" />
          <path d="M231 74 Q270 66 300 82 Q280 92 302 112 Q268 104 231 116Z" fill="#0F0D0E" />
          <path d="M206 198 L216 186 L222 196 L228 182 L236 196 L242 188 L250 198Z" fill="#E08A3C" opacity=".85" />
          <path d="M0 300 V250 Q120 230 260 252 T440 246 V300Z" fill="#141012" />
        </>
      )}
      {campaign === 'steppe-wolves' && (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#171C24" />
              <stop offset=".75" stopColor="#3A4250" />
              <stop offset="1" stopColor="#6A6450" />
            </linearGradient>
          </defs>
          <rect width="440" height="300" fill={`url(#${id('sky')})`} />
          <circle cx="300" cy="96" r="40" fill="#E9DEC3" opacity=".8" />
          <path d="M0 240 Q90 214 170 222 Q240 170 300 222 Q380 216 440 230 V300 H0Z" fill="#2B2F2A" />
          <path d="M236 190 l6 -18 l4 -14 l6 -10 l3 9 l7 3 l-4 6 l-4 2 l2 16 l14 10 l20 2 l4 8 l-58 0z" fill="#121416" />
          <path d="M0 300 V262 Q140 246 280 262 T440 258 V300Z" fill="#14161A" />
          <path d="M30 262 l4 -16 M38 262 l-2 -14 M70 260 l3 -12 M120 256 l-3 -14 M128 256 l4 -12 M380 258 l3 -14 M410 260 l-3 -12" stroke="#14161A" strokeWidth="2" />
        </>
      )}
      {campaign === 'final-battle' && (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1A1213" />
              <stop offset=".6" stopColor="#4A1E1A" />
              <stop offset="1" stopColor="#7A3A24" />
            </linearGradient>
          </defs>
          <rect width="440" height="300" fill={`url(#${id('sky')})`} />
          <path d="M0 236 Q110 206 220 216 T440 226 V300 H0Z" fill="#241615" />
          {/* The king of the robbers in a fur cloak, a heavy saber at his side */}
          <path d="M190 236 C190 176 204 150 220 142 C206 128 206 104 220 92 C234 104 234 128 220 142 C236 150 250 176 250 236Z" fill="#0D0909" />
          <path d="M206 92 l4 -12 l5 8 l5 -10 l5 10 l5 -8 l4 12z" fill="#C9A24A" />
          <path d="M248 182 L282 236" stroke="#0D0909" strokeWidth="5" strokeLinecap="round" />
          <path d="M0 300 V256 Q120 240 260 258 T440 250 V300Z" fill="#120C0C" />
        </>
      )}
    </svg>
  );
}

const CROPS: Readonly<Record<CampaignId, string>> = {
  'forest-ravens': '200 40 220 220',
  'black-flag': '120 40 220 220',
  'steppe-wolves': '170 60 200 200',
  'final-battle': '110 60 220 220',
};

// Screen 5: on a forest road the cossack blocks the way of a fleeing robber.
export function PrepScene({ label }: { label: string }) {
  const id = useSvgId('prep');

  return (
    <svg className="k-scene" viewBox="0 0 390 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26342C" />
          <stop offset=".6" stopColor="#5E6644" />
          <stop offset="1" stopColor="#8B7A4A" />
        </linearGradient>
        <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stopColor="#121416" stopOpacity="0" />
          <stop offset="1" stopColor="#121416" />
        </linearGradient>
      </defs>
      <rect width="390" height="250" fill={`url(#${id('sky')})`} />
      <path d="M0 150 L20 100 L36 140 L58 80 L80 145 L100 95 L120 140 L146 70 L170 145 L196 100 L220 140 L246 80 L270 145 L300 90 L322 140 L350 75 L374 140 L390 110 V250 H0Z" fill="#2F4537" />
      <path d="M0 190 L14 130 L30 180 L50 110 L70 190 L88 130 L104 190 L300 190 L316 120 L334 190 L356 110 L376 190 L390 150 V250 H0Z" fill="#1A2721" />
      <path d="M150 250 C170 210 190 180 200 150 L220 150 C226 180 250 210 290 250Z" fill="#6E5C40" />
      <g transform="translate(214 196)" fill="#0E1210">
        <circle cx="0" cy="-44" r="7" />
        <path d="M-7 -36 C-10 -26 -10 -18 -8 -10 L-16 6 L-10 8 L-2 -6 L4 8 L10 6 L4 -12 C6 -20 6 -28 4 -36Z" />
        <path d="M-6 -32 L-20 -22 M4 -32 L16 -40" stroke="#0E1210" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform="translate(120 238)" fill="#0B0E0C">
        <path d="M-10 -84 C-10 -96 10 -96 10 -84 L8 -78 H-8Z" />
        <path d="M-9 -78 C-12 -60 -18 -40 -22 0 H22 C18 -40 12 -60 9 -78Z" />
        <path d="M-9 -70 L-34 -56 M9 -70 L34 -58" stroke="#0B0E0C" strokeWidth="7" strokeLinecap="round" />
        <path d="M30 -60 L60 -84" stroke="#C9A24A" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <rect width="390" height="250" fill={`url(#${id('fade')})`} />
    </svg>
  );
}

// The leader of a stage in his stronghold, hooded, with a raven feather and burning eyes.
export function BossPortrait({ label, className = 'k-portrait' }: { label: string; className?: string }) {
  const id = useSvgId('boss');

  return (
    <svg className={className} viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <radialGradient id={id('bg')} cx=".5" cy=".7" r=".8">
          <stop offset="0" stopColor="#6A2420" />
          <stop offset="1" stopColor="#1A1012" />
        </radialGradient>
      </defs>
      <rect width="340" height="190" fill={`url(#${id('bg')})`} />
      <path d="M0 150 v-40 l8 -12 l8 12 v40 M24 150 v-46 l8 -12 l8 12 v46 M290 150 v-46 l8 -12 l8 12 v46 M314 150 v-40 l8 -12 l8 12 v40" fill="#2A1A16" />
      <path d="M118 190 C118 140 136 120 150 112 C140 100 138 80 146 64 C156 44 184 44 194 64 C202 80 200 100 190 112 C204 120 222 140 222 190Z" fill="#0D0B0C" />
      <path d="M146 64 C150 36 190 36 194 64 C186 56 154 56 146 64Z" fill="#0D0B0C" />
      <path d="M196 60 C214 40 226 30 236 18 C230 40 220 56 200 70Z" fill="#141016" />
      <path d="M156 86 h10 M174 86 h10" stroke="#E0685C" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Screen 7: the cossack stands over the captured robber, his club lies on the road.
export function VictoryScene({ label }: { label: string }) {
  const id = useSvgId('victory');

  return (
    <svg className="k-scene" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A3A30" />
          <stop offset=".6" stopColor="#7A7046" />
          <stop offset="1" stopColor="#B08F52" />
        </linearGradient>
        <radialGradient id={id('glow')} cx=".38" cy=".55" r=".5">
          <stop offset="0" stopColor="#F1D58A" stopOpacity=".55" />
          <stop offset="1" stopColor="#F1D58A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".6" stopColor="#121416" stopOpacity="0" />
          <stop offset="1" stopColor="#121416" />
        </linearGradient>
      </defs>
      <rect width="390" height="300" fill={`url(#${id('sky')})`} />
      <rect width="390" height="300" fill={`url(#${id('glow')})`} />
      <path d="M0 170 L20 120 L36 160 L58 100 L80 165 L100 115 L120 160 L300 160 L322 110 L350 165 L374 105 L390 140 V300 H0Z" fill="#2F4537" />
      <path d="M0 210 L14 150 L30 200 L50 140 L70 210 L320 210 L336 140 L356 200 L376 150 L390 180 V300 H0Z" fill="#1A2721" />
      <path d="M90 300 C120 260 160 230 180 210 L230 210 C250 240 290 270 330 300Z" fill="#6E5C40" />
      <g transform="translate(150 268)" fill="#0B0E0C">
        <path d="M-12 -112 C-12 -128 12 -128 12 -112 L10 -104 H-10Z" />
        <path d="M-11 -104 C-14 -80 -22 -50 -26 0 H26 C22 -50 14 -80 11 -104Z" />
        <path d="M-11 -96 L-30 -70 M11 -96 L28 -122" stroke="#0B0E0C" strokeWidth="8" strokeLinecap="round" />
        <path d="M28 -122 V-172" stroke="#3B2A1E" strokeWidth="3" />
        <path d="M28 -170 L64 -160 L28 -146Z" fill="#C9A24A" />
      </g>
      <g transform="translate(232 268)" fill="#141816">
        <circle cx="0" cy="-58" r="8" />
        <path d="M-9 -50 C-12 -36 -10 -24 -6 -16 L-22 -2 H10 L6 -16 C10 -26 10 -38 8 -50Z" />
        <path d="M-4 -40 L4 -30" stroke="#6E5C40" strokeWidth="3" />
      </g>
      <path d="M262 266 L304 252" stroke="#2A1E16" strokeWidth="6" strokeLinecap="round" />
      <rect width="390" height="300" fill={`url(#${id('fade')})`} />
    </svg>
  );
}

// Screen 8: the cossack banner over the taken stronghold, the ravens fly off under a crimson sky.
export function BossVictoryScene({ label }: { label: string }) {
  const id = useSvgId('triumph');

  return (
    <svg className="k-backdrop" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1514" />
          <stop offset=".35" stopColor="#7A3424" />
          <stop offset=".5" stopColor="#C08048" />
          <stop offset=".62" stopColor="#3A1E1A" />
          <stop offset="1" stopColor="#120D0D" />
        </linearGradient>
        <radialGradient id={id('sun')} cx=".5" cy=".42" r=".45">
          <stop offset="0" stopColor="#F6D98E" stopOpacity=".9" />
          <stop offset=".35" stopColor="#E9A657" stopOpacity=".35" />
          <stop offset="1" stopColor="#E9A657" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="844" fill={`url(#${id('sky')})`} />
      <path d="M195 350 L20 60 M195 350 L110 30 M195 350 L195 20 M195 350 L280 30 M195 350 L370 60 M195 350 L-40 200 M195 350 L430 200" stroke="#F6D98E" strokeOpacity=".18" strokeWidth="10" />
      <rect width="390" height="844" fill={`url(#${id('sun')})`} />
      <ellipse cx="195" cy="470" rx="260" ry="90" fill="#2A1A16" />
      <path d="M40 440 v-56 l9 -14 l9 14 v56 M60 440 v-62 l9 -14 l9 14 v62 M80 440 v-58 l9 -14 l9 14 v58 M292 440 v-58 l9 -14 l9 14 v58 M312 440 v-62 l9 -14 l9 14 v62 M332 440 v-56 l9 -14 l9 14 v56" fill="#1A110F" />
      <rect x="150" y="330" width="90" height="112" fill="#1A110F" />
      <path d="M140 330 L195 282 L250 330Z" fill="#1A110F" />
      <path d="M195 282 V160" stroke="#1A110F" strokeWidth="5" />
      <path d="M198 164 Q244 154 282 176 Q252 192 284 214 Q240 206 198 222Z" fill="#9E2B25" stroke="#E2C27A" strokeWidth="2" />
      <circle cx="232" cy="190" r="9" fill="none" stroke="#E2C27A" strokeWidth="2" />
      <Ravens color="#120D0D" birds={[[60, 140, 9], [30, 200, 7], [320, 120, 8], [350, 230, 6]]} />
      <path d="M120 500 L180 486 L176 500 Z" fill="#0A0808" />
    </svg>
  );
}

// §24.5: the robber slips away into the dusk; the level waits for the next try.
export function DefeatScene({ label }: { label: string }) {
  const id = useSvgId('defeat');

  return (
    <svg className="k-scene" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141A1E" />
          <stop offset=".6" stopColor="#2E3A3A" />
          <stop offset="1" stopColor="#4A4A3A" />
        </linearGradient>
        <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stopColor="#121416" stopOpacity="0" />
          <stop offset="1" stopColor="#121416" />
        </linearGradient>
      </defs>
      <rect width="390" height="300" fill={`url(#${id('sky')})`} />
      <circle cx="300" cy="80" r="26" fill="#E9DEC3" opacity=".35" />
      <path d="M0 180 L20 130 L36 170 L58 110 L80 175 L100 125 L120 170 L146 100 L170 175 L196 130 L220 170 L246 110 L270 175 L300 120 L322 170 L350 105 L374 170 L390 140 V300 H0Z" fill="#1F2D26" />
      <path d="M0 220 L14 160 L30 210 L50 140 L70 220 L320 220 L336 150 L356 210 L376 160 L390 190 V300 H0Z" fill="#141F1A" />
      <path d="M120 300 C150 260 190 236 220 224 L250 224 C266 250 300 276 340 300Z" fill="#4A3E2C" />
      <g transform="translate(268 226)" fill="#0B0E0C" opacity=".85">
        <circle cx="0" cy="-30" r="6" />
        <path d="M-5 -24 C-8 -14 -6 -8 -4 0 H5 C6 -10 6 -18 4 -24Z" />
      </g>
      <Ravens birds={[[90, 70, 7], [130, 50, 5], [60, 100, 5]]} />
      <rect width="390" height="300" fill={`url(#${id('fade')})`} />
    </svg>
  );
}
