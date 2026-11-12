// §24.4: two pools of energy pace the game, one for fights and one for the journey.
export type EnergyPool = 'fight' | 'campaign';

const HOUR_MS = 3_600_000;

export interface EnergyRule {
  readonly max: number;
  // One unit comes back after this time.
  readonly periodMs: number;
}

export const ENERGY: Readonly<Record<EnergyPool, EnergyRule>> = {
  fight: { max: 10, periodMs: 2 * HOUR_MS },
  campaign: { max: 6, periodMs: 2 * HOUR_MS },
};

export interface Energy {
  readonly value: number;
  readonly max: number;
  // When the next unit comes back, or null while the pool is full.
  readonly nextAt: string | null;
  // When the pool is full again, or null while it is full.
  readonly fullAt: string | null;
}

/**
 * The state of a pool is the moment it is full again: every unit spent moves it one period
 * later, and the units come back one by one before it (null: nothing to come back). The game
 * keeps that moment in each battle, so the newest battle tells the state of its pool.
 */
export function energyAt(pool: EnergyPool, fullAt: string | null, now: Date): Energy {
  const { max, periodMs } = ENERGY[pool];
  const full = fullAt === null ? null : Date.parse(fullAt);

  if (full === null || full <= now.getTime()) {
    return { value: max, max, nextAt: null, fullAt: null };
  }
  // A battle on another device may have spent more than the pool holds: it waits at zero then.
  const missing = Math.min(max, Math.ceil((full - now.getTime()) / periodMs));

  return {
    value: max - missing,
    max,
    nextAt: new Date(full - (missing - 1) * periodMs).toISOString(),
    fullAt: new Date(full).toISOString(),
  };
}

// The moment the pool is full again once a unit is spent at `now`, or null when none is left.
export function spendEnergy(pool: EnergyPool, fullAt: string | null, now: Date): string | null {
  if (energyAt(pool, fullAt, now).value < 1) {
    return null;
  }
  const from = Math.max(now.getTime(), fullAt === null ? 0 : Date.parse(fullAt));

  return new Date(from + ENERGY[pool].periodMs).toISOString();
}

// Two sources may know of different battles: the later moment has seen more of them.
export function laterFullAt(a: string | null, b: string | null): string | null {
  if (a === null || b === null) {
    return a ?? b;
  }

  return Date.parse(a) >= Date.parse(b) ? a : b;
}
