import { describe, expect, it } from 'vitest';
import {
  EXERCISE_DESCRIPTION_MAX,
  EXERCISE_NAME_MAX,
  EXERCISES_MAX,
  ROUNDS_DEFAULT,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SET_REPS_DEFAULT,
  SET_REPS_MAX,
  SET_REPS_MIN,
} from './limits';

// Written out by hand: other tests build their inputs from these constants and would follow a typo.
describe('limits', () => {
  it('match the specification', () => {
    expect({
      ROUNDS_MIN,
      ROUNDS_MAX,
      ROUNDS_DEFAULT,
      EXERCISES_MAX,
      SET_REPS_MIN,
      SET_REPS_MAX,
      SET_REPS_DEFAULT,
      EXERCISE_NAME_MAX,
      EXERCISE_DESCRIPTION_MAX,
    }).toEqual({
      ROUNDS_MIN: 1,
      ROUNDS_MAX: 10,
      ROUNDS_DEFAULT: 3,
      EXERCISES_MAX: 20,
      SET_REPS_MIN: 1,
      SET_REPS_MAX: 999,
      SET_REPS_DEFAULT: 10,
      EXERCISE_NAME_MAX: 60,
      EXERCISE_DESCRIPTION_MAX: 200,
    });
  });
});
