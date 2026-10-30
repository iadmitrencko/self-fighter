import {
  DIFFICULTY_PERCENTS,
  OVERSHOOT_CEILING_PERCENT,
  OVERSHOOT_PROBABILITY_PERCENT,
} from '../config/limits';
import type { Difficulty } from '../config/types';

// Uniform in [0, 1), like Math.random.
export type Rng = () => number;

export interface Range {
  readonly min: number;
  readonly max: number;
}

export function randomInt(rng: Rng, { min, max }: Range): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Whole-number math only: `upperBound * 0.7` gives 62 instead of 63 for 90 (R8).
export function levelRange(upperBound: number, difficulty: Difficulty): Range {
  const { low, high } = DIFFICULTY_PERCENTS[difficulty];
  const min = Math.ceil((upperBound * low) / 100);
  const max = Math.floor((upperBound * high) / 100);

  return { min, max: Math.max(min, max) };
}

export function overshootRange(upperBound: number): Range {
  const min = upperBound + 1;
  const max = Math.ceil((upperBound * OVERSHOOT_CEILING_PERCENT) / 100);

  return { min, max: Math.max(min, max) };
}

export function rollLevelOpponent(rng: Rng, upperBound: number, difficulty: Difficulty): number {
  const overshoots = difficulty === 'hard' && rng() * 100 < OVERSHOOT_PROBABILITY_PERCENT;

  return randomInt(
    rng,
    overshoots ? overshootRange(upperBound) : levelRange(upperBound, difficulty),
  );
}
