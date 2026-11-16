import type { CSSProperties, ReactNode } from 'react';
import type { Energy, EnergyPool } from '../../domain/kozak/energy';
import type { Status } from '../../domain/kozak/progress';
import { energyStatus, energyTexts, formatWait, gloryRewards, kozakTexts, statusNames } from '../../i18n/kozak';
import { Screen } from '../components/Screen';
import { ErrorNotice } from '../components/notices';
import { useCossack, type Cossack } from './record';

// Line icons of the game. They are decoration: a text next to them says the same.
const ICONS = {
  cossack: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2',
  fight: 'M4 4l11 11M20 4 9 15M14 17l3 3M10 17l-3 3M17 14l3 3M7 14l-3 3',
  journey: 'M5 21V4M5 4h11l-2 4 2 4H5',
  ranks: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM11 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  check: 'M5 12l5 5 9-10',
  back: 'M15 18l-6-6 6-6',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  play: 'M8 5v14l11-7z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  glory: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  // A dumbbell: the repetitions of the exercises (§24.10).
  strength: 'M6 5v14M18 5v14M2.5 9v6M21.5 9v6M6 12h12',
  // The menu of the player: the sections that do not fit the bar of a phone, the site, signing out.
  more: 'M6.5 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM21 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z',
  chevron: 'M6 9l6 6 6-6',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  leave: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
} as const;

export type KozakIconName = keyof typeof ICONS;

const FILLED: ReadonlySet<KozakIconName> = new Set(['pause', 'play', 'bolt', 'glory', 'more']);

export function KozakIcon({ name, className = 'kozak-icon' }: { name: KozakIconName; className?: string }) {
  const filled = FILLED.has(name);

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// The raven of the bosses: on their markers, cards and badges.
export function Raven({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 30c6-2 10-8 14-14 2-3 6-5 10-4l4-4 2 5c3 1 5 4 5 7l-7-1c-2 6-7 11-14 13l-6 8-1-6c-3 0-5-1-7-4z" fill={color} />
      <circle cx="31" cy="15" r="1.6" fill="var(--k-blood)" />
    </svg>
  );
}

// A screen of the game: the frame of the site, the colors of the game.
export function KozakScreen({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <Screen title={title}>
      <div className={className === undefined ? 'k-screen' : `k-screen ${className}`}>{children}</div>
    </Screen>
  );
}

export type BadgeTone = 'done' | 'open' | 'locked' | 'boss';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`k-badge k-badge--${tone}`}>
      {tone === 'done' && <KozakIcon name="check" className="k-badge__icon" />}
      {tone === 'locked' && <KozakIcon name="lock" className="k-badge__icon" />}
      {children}
    </span>
  );
}

const TONES: Readonly<Record<Status, BadgeTone>> = { done: 'done', current: 'open', locked: 'locked' };

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={TONES[status]}>{statusNames[status]}</Badge>;
}

export function Bar({ value, max, label, thin = false }: { value: number; max: number; label: string; thin?: boolean }) {
  return (
    <div
      className={thin ? 'k-bar k-bar--thin' : 'k-bar'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className="k-bar__fill" style={{ '--share': `${max === 0 ? 0 : (value / max) * 100}%` } as CSSProperties} />
    </div>
  );
}

// §24.4: how much energy a pool holds and when the next unit comes back.
export function EnergyMeter({ pool, energy, now, compact = false }: { pool: EnergyPool; energy: Energy; now: Date; compact?: boolean }) {
  const { name, every } = energyTexts[pool];
  const wait = energy.nextAt === null ? null : formatWait(Date.parse(energy.nextAt) - now.getTime());

  return (
    <div className={`k-energy k-energy--${pool}${compact ? ' k-energy--compact' : ''}${energy.value === 0 ? ' k-energy--empty' : ''}`}>
      <p className="k-energy__head">
        <span className="k-energy__name">
          <KozakIcon name="bolt" className="k-energy__icon" />
          {name}
        </span>
        <b className="k-energy__value">
          <span aria-hidden="true">{energyStatus.value(energy.value, energy.max)}</span>
          <span className="visually-hidden">{energyStatus.spoken(energy.value, energy.max)}</span>
        </b>
      </p>
      <EnergyCells energy={energy} />
      <p className="k-energy__note">{wait === null ? `${energyStatus.full} · ${every}` : energyStatus.next(wait)}</p>
    </div>
  );
}

// A cell for every unit of a pool, the full ones in gold. The number beside it speaks for it.
export function EnergyCells({ energy }: { energy: Energy }) {
  return (
    <div className="k-energy__cells" aria-hidden="true">
      {Array.from({ length: energy.max }, (_, index) => (
        <span key={index} className={index < energy.value ? 'k-energy__cell k-energy__cell--full' : 'k-energy__cell'} />
      ))}
    </div>
  );
}

// §24.3: what brings glory, beside the glory of the cossack and on the page of the ranks.
export function GloryRewards() {
  return (
    <dl className="k-how">
      {gloryRewards.map(([what, amount]) => (
        <div key={what} className="k-how__item">
          <dt>{what}</dt>
          <dd>{amount}</dd>
        </div>
      ))}
    </dl>
  );
}

// While the record of the game loads or fails, a screen says so instead of guessing.
export function WithCossack({ children }: { children: (cossack: Cossack) => ReactNode }) {
  const { cossack, reload } = useCossack();

  if (cossack.status === 'loading') {
    return (
      <p className="k-loading" role="status">
        {kozakTexts.loading}
      </p>
    );
  }
  if (cossack.status === 'failed') {
    return <ErrorNotice error={cossack.error} onRetry={reload} />;
  }

  return children(cossack.value);
}
