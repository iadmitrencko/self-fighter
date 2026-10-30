import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_PERCENTS,
  EXERCISE_DESCRIPTION_MAX,
  EXERCISE_NAME_MAX,
  EXERCISES_MAX,
  LADDER_MAX,
  OPPONENT_BOUND_MAX,
  OPPONENT_BOUND_MIN,
  OVERSHOOT_CEILING_PERCENT,
  OVERSHOOT_PROBABILITY_PERCENT,
  REPS_MAX,
  ROUNDS_DEFAULT,
  ROUNDS_MAX,
  ROUNDS_MIN,
} from './limits';

// Written out by hand: other tests build their inputs from these constants and would follow a typo.
describe('limits', () => {
  it('match the specification', () => {
    expect({
      ROUNDS_MIN,
      ROUNDS_MAX,
      ROUNDS_DEFAULT,
      EXERCISES_MAX,
      REPS_MAX,
      OPPONENT_BOUND_MIN,
      OPPONENT_BOUND_MAX,
      LADDER_MAX,
      EXERCISE_NAME_MAX,
      EXERCISE_DESCRIPTION_MAX,
      OVERSHOOT_PROBABILITY_PERCENT,
      OVERSHOOT_CEILING_PERCENT,
      DIFFICULTY_PERCENTS,
    }).toEqual({
      ROUNDS_MIN: 1,
      ROUNDS_MAX: 20,
      ROUNDS_DEFAULT: 5,
      EXERCISES_MAX: 20,
      REPS_MAX: 9999,
      OPPONENT_BOUND_MIN: 1,
      OPPONENT_BOUND_MAX: 100,
      LADDER_MAX: 100,
      EXERCISE_NAME_MAX: 60,
      EXERCISE_DESCRIPTION_MAX: 200,
      OVERSHOOT_PROBABILITY_PERCENT: 10,
      OVERSHOOT_CEILING_PERCENT: 120,
      DIFFICULTY_PERCENTS: {
        easy: { low: 10, high: 50 },
        medium: { low: 30, high: 70 },
        hard: { low: 50, high: 100 },
      },
    });
  });
});
