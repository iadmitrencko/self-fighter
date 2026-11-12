import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ENERGY, energyAt, laterFullAt, spendEnergy, type EnergyPool } from './energy';

const HOUR = 3_600_000;
const NOW = new Date('2026-11-10T12:00:00.000Z');
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const iso = (hours: number) => at(hours).toISOString();

// Spends one unit after another at the given hours, as the battles of the game do.
function spendAt(pool: EnergyPool, hours: readonly number[]): string | null {
  return hours.reduce<string | null>((fullAt, hour) => spendEnergy(pool, fullAt, at(hour)), null);
}

describe('energy', () => {
  // §24.4: 10 for fights and 6 for the journey, with one back every 2 hours in both.
  it('follows the rules of the brief', () => {
    expect(ENERGY).toEqual({
      fight: { max: 10, periodMs: 2 * HOUR },
      campaign: { max: 6, periodMs: 2 * HOUR },
    });
  });

  it('is full before the first battle', () => {
    expect(energyAt('fight', null, NOW)).toEqual({ value: 10, max: 10, nextAt: null, fullAt: null });
    expect(energyAt('campaign', iso(-1), NOW)).toEqual({ value: 6, max: 6, nextAt: null, fullAt: null });
  });

  it('takes a unit for a battle and gives it back after a period', () => {
    const fullAt = spendEnergy('campaign', null, NOW);

    expect(fullAt).toBe(iso(2));
    expect(energyAt('campaign', fullAt, at(1))).toEqual({ value: 5, max: 6, nextAt: iso(2), fullAt: iso(2) });
    expect(energyAt('campaign', fullAt, at(2)).value).toBe(6);
  });

  // The units come back one by one, a period apart, from the moment the pool stops being full.
  it('gives the units back one by one', () => {
    const fullAt = spendAt('campaign', [0, 0, 0]);

    expect(fullAt).toBe(iso(6));
    expect(energyAt('campaign', fullAt, at(0))).toMatchObject({ value: 3, nextAt: iso(2) });
    expect(energyAt('campaign', fullAt, at(1.9))).toMatchObject({ value: 3, nextAt: iso(2) });
    expect(energyAt('campaign', fullAt, at(2))).toMatchObject({ value: 4, nextAt: iso(4) });
    expect(energyAt('campaign', fullAt, at(5))).toMatchObject({ value: 5, nextAt: iso(6) });
  });

  // A battle while units are on their way does not restart the wait for the next one.
  it('keeps the wait of the units on their way', () => {
    expect(spendAt('campaign', [0, 1])).toBe(iso(4));
    expect(energyAt('campaign', iso(4), at(1))).toMatchObject({ value: 4, nextAt: iso(2) });
  });

  it('refuses a battle with no energy left', () => {
    const empty = spendAt('campaign', [0, 0, 0, 0, 0, 0]);

    expect(energyAt('campaign', empty, NOW)).toMatchObject({ value: 0, nextAt: iso(2) });
    expect(spendEnergy('campaign', empty, NOW)).toBeNull();
    expect(spendEnergy('campaign', empty, at(2))).toBe(iso(14));
  });

  // Two devices may both spend the last unit: the pool waits at zero instead of going below it.
  it('never shows less than zero', () => {
    const overspent = iso(16);

    expect(energyAt('campaign', overspent, NOW)).toEqual({ value: 0, max: 6, nextAt: iso(6), fullAt: overspent });
  });

  it('never holds more than its maximum or less than zero', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<EnergyPool>('fight', 'campaign'),
        fc.array(fc.integer({ min: 0, max: 200 }), { maxLength: 40 }),
        fc.integer({ min: 0, max: 300 }),
        (pool, hours, later) => {
          const sorted = [...hours].sort((a, b) => a - b);
          let fullAt: string | null = null;

          for (const hour of sorted) {
            const before = energyAt(pool, fullAt, at(hour)).value;
            const spent = spendEnergy(pool, fullAt, at(hour));

            expect(spent === null).toBe(before === 0);
            fullAt = spent ?? fullAt;
            expect(energyAt(pool, fullAt, at(hour)).value).toBe(spent === null ? 0 : before - 1);
          }
          const { value, max } = energyAt(pool, fullAt, at((sorted.at(-1) ?? 0) + later));

          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(max);
        },
      ),
    );
  });

  it('takes the later of two moments', () => {
    expect(laterFullAt(null, null)).toBeNull();
    expect(laterFullAt(iso(1), null)).toBe(iso(1));
    expect(laterFullAt(null, iso(2))).toBe(iso(2));
    expect(laterFullAt(iso(1), iso(2))).toBe(iso(2));
    expect(laterFullAt(iso(3), iso(2))).toBe(iso(3));
  });
});
