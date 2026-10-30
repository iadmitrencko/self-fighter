import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_PERCENTS,
  OPPONENT_BOUND_MAX,
  OPPONENT_BOUND_MIN,
} from '../config/limits';
import type { Difficulty } from '../config/types';
import { difficultyArbitrary, seededRng, sequenceRng } from '../testing/fixtures';
import { levelRange, overshootRange, randomInt, rollLevelOpponent } from './opponents';

const ALMOST_ONE = 1 - Number.EPSILON / 2;
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const UPPER_BOUNDS = Array.from({ length: OPPONENT_BOUND_MAX }, (_, index) => index + 1);

const rngValueArbitrary = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });
const upperBoundArbitrary = fc.integer({ min: OPPONENT_BOUND_MIN, max: OPPONENT_BOUND_MAX });

describe('randomInt', () => {
  // §7.3: both bounds belong to the range.
  it('reaches both bounds', () => {
    expect(randomInt(() => 0, { min: 20, max: 40 })).toBe(20);
    expect(randomInt(() => ALMOST_ONE, { min: 20, max: 40 })).toBe(40);
  });

  it('returns the only value of a single-value range', () => {
    expect(randomInt(() => ALMOST_ONE, { min: 7, max: 7 })).toBe(7);
  });

  // §7.3: the range 20–40 can give 20, 21, 22 and so on up to 40.
  it('gives every value of the range about equally often', () => {
    const rng = seededRng(2026);
    const draws = 42_000;
    const counts = new Map<number, number>();

    for (let draw = 0; draw < draws; draw += 1) {
      const value = randomInt(rng, { min: 20, max: 40 });
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    expect([...counts.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 21 }, (_, index) => 20 + index),
    );
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(1800);
      expect(count).toBeLessThan(2200);
    }
  });

  it('stays an integer inside any range', () => {
    fc.assert(
      fc.property(
        rngValueArbitrary,
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (value, a, b) => {
          const range = { min: Math.min(a, b), max: Math.max(a, b) };
          const result = randomInt(() => value, range);

          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(range.min);
          expect(result).toBeLessThanOrEqual(range.max);
        },
      ),
    );
  });
});

describe('levelRange', () => {
  // §8.3 and §8.4.
  it.each([
    ['easy', 10, 50],
    ['medium', 30, 70],
    ['hard', 50, 100],
  ] as const)('with an upper bound of 100, %s gives %i–%i', (difficulty, min, max) => {
    expect(levelRange(100, difficulty)).toEqual({ min, max });
  });

  // R8: a float multiplier would give 62 here.
  it('gives 27–63 on medium for an upper bound of 90', () => {
    expect(levelRange(90, 'medium')).toEqual({ min: 27, max: 63 });
  });

  // R7: §8.4 requires a valid range even when the formula gives 1–0.
  it.each(DIFFICULTIES)('gives 1–1 on %s for an upper bound of 1', (difficulty) => {
    expect(levelRange(1, difficulty)).toEqual({ min: 1, max: 1 });
  });

  it('rounds the lower bound up and the upper bound down', () => {
    expect(levelRange(7, 'medium')).toEqual({ min: 3, max: 4 });
    expect(levelRange(7, 'easy')).toEqual({ min: 1, max: 3 });
  });

  // Checked exactly in whole numbers for every value a user can enter.
  it.each(DIFFICULTIES)('matches the formula for every upper bound on %s', (difficulty) => {
    const { low, high } = DIFFICULTY_PERCENTS[difficulty];

    for (const upperBound of UPPER_BOUNDS) {
      const { min, max } = levelRange(upperBound, difficulty);
      const lowShare = upperBound * low;
      const highShare = upperBound * high;

      expect(min).toBeGreaterThanOrEqual(1);
      expect(min).toBeLessThanOrEqual(max);
      expect(max).toBeLessThanOrEqual(upperBound);
      expect(min * 100).toBeGreaterThanOrEqual(lowShare);
      expect((min - 1) * 100).toBeLessThan(lowShare);

      if (max > min) {
        expect(max * 100).toBeLessThanOrEqual(highShare);
        expect((max + 1) * 100).toBeGreaterThan(highShare);
      }
    }
  });
});

describe('overshootRange', () => {
  // §8.5.
  it('gives 101–120 for an upper bound of 100', () => {
    expect(overshootRange(100)).toEqual({ min: 101, max: 120 });
  });

  it('stays above the upper bound when 120% rounds down to it', () => {
    expect(overshootRange(1)).toEqual({ min: 2, max: 2 });
    expect(overshootRange(4)).toEqual({ min: 5, max: 5 });
  });

  it('is valid for every upper bound', () => {
    for (const upperBound of UPPER_BOUNDS) {
      const { min, max } = overshootRange(upperBound);

      expect(min).toBe(upperBound + 1);
      expect(max).toBeGreaterThanOrEqual(min);

      if (max > min) {
        expect(max * 100).toBeGreaterThanOrEqual(upperBound * 120);
        expect((max - 1) * 100).toBeLessThan(upperBound * 120);
      }
    }
  });
});

describe('rollLevelOpponent', () => {
  it('overshoots a hard opponent below the probability threshold', () => {
    expect(rollLevelOpponent(sequenceRng(0.09, 0), 100, 'hard')).toBe(101);
    expect(rollLevelOpponent(sequenceRng(0.09, ALMOST_ONE), 100, 'hard')).toBe(120);
  });

  it('keeps a hard opponent in the base range from the threshold on', () => {
    expect(rollLevelOpponent(sequenceRng(0.1, 0), 100, 'hard')).toBe(50);
    expect(rollLevelOpponent(sequenceRng(0.1, ALMOST_ONE), 100, 'hard')).toBe(100);
  });

  // §8.5: only the hard level may exceed the upper bound.
  it.each(['easy', 'medium'] as const)('never overshoots on %s', (difficulty) => {
    const { max } = levelRange(100, difficulty);

    expect(rollLevelOpponent(() => 0, 100, difficulty)).toBe(levelRange(100, difficulty).min);
    expect(rollLevelOpponent(() => ALMOST_ONE, 100, difficulty)).toBe(max);
  });

  // §8.5: the default probability is 10%.
  it('overshoots about 10% of hard opponents', () => {
    const rng = seededRng(7);
    const draws = 100_000;
    let overshoots = 0;

    for (let draw = 0; draw < draws; draw += 1) {
      overshoots += rollLevelOpponent(rng, 100, 'hard') > 100 ? 1 : 0;
    }

    expect(overshoots / draws).toBeGreaterThan(0.095);
    expect(overshoots / draws).toBeLessThan(0.105);
  });

  it('stays inside the allowed range for any input', () => {
    fc.assert(
      fc.property(
        upperBoundArbitrary,
        difficultyArbitrary,
        fc.integer(),
        (upperBound, difficulty, seed) => {
          const result = rollLevelOpponent(seededRng(seed), upperBound, difficulty);
          const base = levelRange(upperBound, difficulty);
          const overshoot = overshootRange(upperBound);
          const inBase = result >= base.min && result <= base.max;
          const inOvershoot =
            difficulty === 'hard' && result >= overshoot.min && result <= overshoot.max;

          expect(Number.isInteger(result)).toBe(true);
          expect(inBase || inOvershoot).toBe(true);
        },
      ),
    );
  });
});
