import fc from 'fast-check';
import type { ExerciseRef } from '../catalog/exercise';
import {
  LADDER_MAX,
  OPPONENT_BOUND_MAX,
  OPPONENT_BOUND_MIN,
  REPS_MAX,
} from '../config/limits';
import type {
  Difficulty,
  LadderConfig,
  OpponentLevelsConfig,
  RandomOpponentConfig,
  TargetConfig,
  WinRule,
  WorkoutConfig,
} from '../config/types';
import type { Rng } from '../engine/opponents';
import type { Stage } from '../engine/rules';
import { nextStageIndex, submitResult, type Session, type SessionDeps } from '../engine/session';

export const pushUps: ExerciseRef = { id: 'push-ups', name: 'Віджимання' };
export const squats: ExerciseRef = { id: 'squats', name: 'Присідання' };
export const pullUps: ExerciseRef = { id: 'pull-ups', name: 'Підтягування' };

export const STARTED_AT = new Date('2026-10-30T10:00:00.000Z');

// Mulberry32: statistical tests always see the same numbers.
export function seededRng(seed: number): Rng {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function sequenceRng(...values: number[]): Rng {
  let index = 0;

  return () => {
    const value = values[index % values.length] as number;
    index += 1;

    return value;
  };
}

export function testDeps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  let created = 0;

  return {
    rng: seededRng(1),
    now: () => STARTED_AT,
    newId: () => {
      created += 1;

      return `attempt-${created}`;
    },
    ...overrides,
  };
}

// Any attempt to change a frozen value throws in strict mode, so it proves a function is pure.
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }

  return value;
}

export function play<TSession extends Session>(
  session: TSession,
  repsFor: (stage: Stage) => number,
): TSession {
  let current = session;

  // Bounded, so a broken engine fails the test instead of hanging it.
  for (let step = 0; step < session.stages.length; step += 1) {
    const index = nextStageIndex(current);

    if (index === null) {
      break;
    }
    current = submitResult(current, index, repsFor(current.stages[index] as Stage));
  }

  return current;
}

export function targetConfig(overrides: Partial<TargetConfig> = {}): TargetConfig {
  return {
    mode: 'target',
    rule: 'over',
    rounds: 2,
    exercises: [
      { ...pushUps, targets: [10, 12] },
      { ...squats, targets: [20, 25] },
    ],
    ...overrides,
  };
}

export function randomOpponentConfig(
  overrides: Partial<RandomOpponentConfig> = {},
): RandomOpponentConfig {
  return {
    mode: 'random-opponent',
    rule: 'over',
    rounds: 2,
    exercises: [
      { ...pushUps, min: 20, max: 40 },
      { ...squats, min: 30, max: 50 },
    ],
    ...overrides,
  };
}

export function opponentLevelsConfig(
  overrides: Partial<OpponentLevelsConfig> = {},
): OpponentLevelsConfig {
  return {
    mode: 'opponent-levels',
    rule: 'over',
    rounds: 2,
    difficulty: 'medium',
    exercises: [
      { ...pushUps, upperBound: 100 },
      { ...squats, upperBound: 90 },
    ],
    ...overrides,
  };
}

export function ladderConfig(overrides: Partial<LadderConfig> = {}): LadderConfig {
  return {
    mode: 'ladder',
    rule: 'over',
    exercise: pullUps,
    max: 5,
    returnDown: true,
    ...overrides,
  };
}

const ruleArbitrary = fc.constantFrom<WinRule>('over', 'meet');
const opponentBoundArbitrary = fc.integer({ min: OPPONENT_BOUND_MIN, max: OPPONENT_BOUND_MAX });
const exerciseRefArbitrary = {
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 60 }),
};

function uniqueExercises<T extends ExerciseRef>(exercise: fc.Arbitrary<T>): fc.Arbitrary<T[]> {
  return fc.uniqueArray(exercise, { minLength: 1, maxLength: 5, selector: ({ id }) => id });
}

const roundsArbitrary = fc.integer({ min: 1, max: 6 });

export const targetConfigArbitrary: fc.Arbitrary<TargetConfig> = roundsArbitrary.chain((rounds) =>
  fc.record({
    mode: fc.constant('target'),
    rule: ruleArbitrary,
    rounds: fc.constant(rounds),
    exercises: uniqueExercises(
      fc.record({
        ...exerciseRefArbitrary,
        targets: fc.array(fc.integer({ min: 0, max: REPS_MAX }), {
          minLength: rounds,
          maxLength: rounds,
        }),
      }),
    ),
  }),
);

export const randomOpponentConfigArbitrary: fc.Arbitrary<RandomOpponentConfig> = fc.record({
  mode: fc.constant('random-opponent'),
  rule: ruleArbitrary,
  rounds: roundsArbitrary,
  exercises: uniqueExercises(
    fc
      .record({ ...exerciseRefArbitrary, a: opponentBoundArbitrary, b: opponentBoundArbitrary })
      .map(({ id, name, a, b }) => ({ id, name, min: Math.min(a, b), max: Math.max(a, b) })),
  ),
});

export const difficultyArbitrary = fc.constantFrom<Difficulty>('easy', 'medium', 'hard');

export const opponentLevelsConfigArbitrary: fc.Arbitrary<OpponentLevelsConfig> = fc.record({
  mode: fc.constant('opponent-levels'),
  rule: ruleArbitrary,
  rounds: roundsArbitrary,
  difficulty: difficultyArbitrary,
  exercises: uniqueExercises(
    fc.record({ ...exerciseRefArbitrary, upperBound: opponentBoundArbitrary }),
  ),
});

export const ladderConfigArbitrary: fc.Arbitrary<LadderConfig> = fc.record({
  mode: fc.constant('ladder'),
  rule: ruleArbitrary,
  exercise: fc.record(exerciseRefArbitrary),
  max: fc.integer({ min: 1, max: LADDER_MAX }),
  returnDown: fc.boolean(),
});

export const workoutConfigArbitrary: fc.Arbitrary<WorkoutConfig> = fc.oneof(
  targetConfigArbitrary,
  randomOpponentConfigArbitrary,
  opponentLevelsConfigArbitrary,
  ladderConfigArbitrary,
);

// Results close to the target reach every outcome, unlike uniform numbers up to 9999.
export function nearTarget(stage: Stage, offset: number): number {
  return Math.min(REPS_MAX, Math.max(0, stage.target + offset));
}

export const offsetsArbitrary = fc.array(fc.integer({ min: -1, max: 1 }), {
  minLength: 1,
  maxLength: 30,
});

export function cycleOffsets(offsets: readonly number[]): (stage: Stage) => number {
  let index = 0;

  return (stage) => {
    const offset = offsets[index % offsets.length] as number;
    index += 1;

    return nearTarget(stage, offset);
  };
}
