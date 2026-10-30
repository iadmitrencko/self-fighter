import type { Difficulty } from './types';

// Limits of the game (§4.2, §4.3, §5.2 and §9.2 of the specification).
export const ROUNDS_MIN = 1;
export const ROUNDS_MAX = 20;
export const ROUNDS_DEFAULT = 5;

export const EXERCISES_MAX = 20;

export const REPS_MAX = 9999;

export const OPPONENT_BOUND_MIN = 1;
export const OPPONENT_BOUND_MAX = 100;

export const LADDER_MAX = 100;

export const EXERCISE_NAME_MAX = 60;
export const EXERCISE_DESCRIPTION_MAX = 200;

// Opponent results as a share of the upper bound, in percent (§8.4).
export const DIFFICULTY_PERCENTS: Record<Difficulty, { low: number; high: number }> = {
  easy: { low: 10, high: 50 },
  medium: { low: 30, high: 70 },
  hard: { low: 50, high: 100 },
};

// A hard opponent sometimes exceeds the upper bound (§8.5).
export const OVERSHOOT_PROBABILITY_PERCENT = 10;
export const OVERSHOOT_CEILING_PERCENT = 120;
