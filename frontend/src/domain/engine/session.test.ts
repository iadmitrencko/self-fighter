import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ROUNDS_MAX, EXERCISES_MAX } from '../config/limits';
import type { RandomOpponentConfig, TargetConfig } from '../config/types';
import {
  cycleOffsets,
  deepFreeze,
  ladderConfig,
  offsetsArbitrary,
  opponentLevelsConfig,
  play,
  pushUps,
  randomOpponentConfig,
  seededRng,
  squats,
  STARTED_AT,
  targetConfig,
  testDeps,
  workoutConfigArbitrary,
} from '../testing/fixtures';
import { levelRange, overshootRange } from './opponents';
import { createSession, nextStageIndex, submitResult } from './session';

describe('createSession', () => {
  it('fixes the id, the start time and the schema version', () => {
    const session = createSession(targetConfig(), testDeps());

    expect(session.id).toBe('attempt-1');
    expect(session.startedAt).toBe(STARTED_AT.toISOString());
    expect(session.schemaVersion).toBe(1);
    expect(session.mode).toBe('target');
  });

  // §6.3: every cell of the table is an independent target.
  it('turns the target table into stages, round by round', () => {
    const config: TargetConfig = {
      mode: 'target',
      rule: 'over',
      rounds: 3,
      exercises: [
        { ...pushUps, targets: [10, 12, 15] },
        { ...squats, targets: [20, 25, 30] },
      ],
    };

    const { stages } = createSession(config, testDeps());

    expect(stages).toEqual([
      { round: 0, exercise: pushUps, target: 10, rule: 'over', actual: null },
      { round: 0, exercise: squats, target: 20, rule: 'over', actual: null },
      { round: 1, exercise: pushUps, target: 12, rule: 'over', actual: null },
      { round: 1, exercise: squats, target: 25, rule: 'over', actual: null },
      { round: 2, exercise: pushUps, target: 15, rule: 'over', actual: null },
      { round: 2, exercise: squats, target: 30, rule: 'over', actual: null },
    ]);
  });

  it('applies the rule of the configuration to every fight stage', () => {
    const { stages } = createSession(targetConfig({ rule: 'meet' }), testDeps());

    expect(stages.every(({ rule }) => rule === 'meet')).toBe(true);
  });

  // §7.3: a separate value for each exercise in each round.
  it('rolls a separate opponent result for every stage', () => {
    const config: RandomOpponentConfig = {
      ...randomOpponentConfig(),
      rounds: ROUNDS_MAX,
      exercises: [{ ...pushUps, min: 1, max: 100 }],
    };

    const { stages } = createSession(config, testDeps());
    const results = stages.map(({ target }) => target);

    expect(results).toHaveLength(ROUNDS_MAX);
    expect(new Set(results).size).toBeGreaterThan(1);
    expect(results.every((result) => result >= 1 && result <= 100)).toBe(true);
  });

  it('uses the range of each exercise for the opponent', () => {
    const { stages } = createSession(randomOpponentConfig({ rounds: 20 }), testDeps());

    for (const { exercise, target } of stages) {
      const { min, max } = exercise.id === pushUps.id ? { min: 20, max: 40 } : { min: 30, max: 50 };

      expect(target).toBeGreaterThanOrEqual(min);
      expect(target).toBeLessThanOrEqual(max);
    }
  });

  it('uses the upper bound of each exercise and the chosen difficulty', () => {
    const config = opponentLevelsConfig({ rounds: 20, difficulty: 'easy' });
    const { stages } = createSession(config, testDeps());

    for (const { exercise, target } of stages) {
      const { min, max } = levelRange(exercise.id === pushUps.id ? 100 : 90, 'easy');

      expect(target).toBeGreaterThanOrEqual(min);
      expect(target).toBeLessThanOrEqual(max);
    }
  });

  it('lets a hard opponent exceed the upper bound', () => {
    const config = opponentLevelsConfig({
      rounds: ROUNDS_MAX,
      difficulty: 'hard',
      exercises: Array.from({ length: EXERCISES_MAX }, (_, index) => ({
        id: `exercise-${index}`,
        name: `Вправа ${index}`,
        upperBound: 100,
      })),
    });

    const { stages } = createSession(config, testDeps());
    const { min, max } = overshootRange(100);
    const overshoots = stages.filter(({ target }) => target > 100);

    expect(overshoots.length).toBeGreaterThan(0);
    expect(overshoots.every(({ target }) => target >= min && target <= max)).toBe(true);
  });

  // 400 stages is the largest fight: 20 rounds of 20 exercises.
  it('builds the largest fight in round order', () => {
    const config = opponentLevelsConfig({
      rounds: ROUNDS_MAX,
      exercises: Array.from({ length: EXERCISES_MAX }, (_, index) => ({
        id: `exercise-${index}`,
        name: `Вправа ${index}`,
        upperBound: 100,
      })),
    });

    const { stages } = createSession(config, testDeps());

    expect(stages.map(({ round }) => round)).toEqual(
      Array.from({ length: 400 }, (_, index) => Math.floor(index / EXERCISES_MAX)),
    );
  });

  // R2: only the top stage ignores the over rule.
  it('applies the top-stage rule to a ladder', () => {
    const { stages } = createSession(ladderConfig(), testDeps());

    expect(stages.map(({ target }) => target)).toEqual([1, 2, 3, 4, 5, 4, 3, 2, 1]);
    expect(stages.map(({ rule }) => rule)).toEqual([
      'over',
      'over',
      'over',
      'over',
      'meet',
      'over',
      'over',
      'over',
      'over',
    ]);
  });

  // §11.6: later changes of the form must not reach a started workout.
  it('does not share the configuration with the caller', () => {
    const targets = [10, 12];
    const exercise = { ...pushUps, targets };
    const config = targetConfig({ exercises: [exercise] });

    const session = createSession(config, testDeps());
    targets[0] = 999;
    exercise.name = 'Нова назва';

    expect(session.config).toEqual(
      targetConfig({ exercises: [{ ...pushUps, targets: [10, 12] }] }),
    );
    expect(session.stages[0]?.target).toBe(10);
  });

  it('gives the same session for the same random sequence', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, fc.integer(), (config, seed) => {
        const first = createSession(config, testDeps({ rng: seededRng(seed) }));
        const second = createSession(config, testDeps({ rng: seededRng(seed) }));

        expect(second).toEqual(first);
      }),
    );
  });

  it('builds the expected number of stages for any configuration', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, (config) => {
        const { stages } = createSession(config, testDeps());

        if (config.mode === 'ladder') {
          expect(stages).toHaveLength(config.returnDown ? 2 * config.max - 1 : config.max);
        } else {
          expect(stages).toHaveLength(config.rounds * config.exercises.length);
        }
      }),
    );
  });
});

describe('nextStageIndex', () => {
  it('walks through the stages in order', () => {
    const session = createSession(targetConfig(), testDeps());

    expect(nextStageIndex(session)).toBe(0);
    expect(nextStageIndex(submitResult(session, 0, 11))).toBe(1);
  });

  it('is null when every stage is filled', () => {
    const session = play(createSession(targetConfig(), testDeps()), () => 0);

    expect(nextStageIndex(session)).toBeNull();
  });

  // §6.7: a lost exercise does not stop a fight, unlike a ladder.
  it('continues a fight after a lost stage', () => {
    const session = createSession(targetConfig(), testDeps());

    expect(nextStageIndex(submitResult(session, 0, 0))).toBe(1);
  });

  // §9.5: a failed stage ends the ladder.
  it('stops a ladder at the first failed stage', () => {
    const session = createSession(ladderConfig(), testDeps());

    expect(nextStageIndex(submitResult(session, 0, 1))).toBeNull();
  });
});

describe('submitResult', () => {
  it('records the result of the stage and nothing else', () => {
    const session = createSession(targetConfig(), testDeps());

    const updated = submitResult(session, 0, 11);

    expect(updated.stages[0]?.actual).toBe(11);
    expect(updated.stages.slice(1)).toEqual(session.stages.slice(1));
  });

  // §12.2: zero is a valid result.
  it('accepts zero', () => {
    const session = createSession(targetConfig(), testDeps());

    expect(submitResult(session, 0, 0).stages[0]?.actual).toBe(0);
  });

  // §12.2: a repeated tap must not duplicate or change the result.
  it('ignores a repeated submission of a filled stage', () => {
    const session = submitResult(createSession(targetConfig(), testDeps()), 0, 11);

    expect(submitResult(session, 0, 11)).toBe(session);
    expect(submitResult(session, 0, 99)).toBe(session);
  });

  it.each([-1, 4, 100])('rejects the unknown stage %i', (stageIndex) => {
    const session = createSession(targetConfig(), testDeps());

    expect(() => submitResult(session, stageIndex, 1)).toThrow(RangeError);
  });

  it('rejects a stage that is not the current one', () => {
    const session = createSession(targetConfig(), testDeps());

    expect(() => submitResult(session, 2, 1)).toThrow(RangeError);
  });

  it('rejects a stage after a failed ladder stage', () => {
    const session = submitResult(createSession(ladderConfig(), testDeps()), 0, 0);

    expect(() => submitResult(session, 1, 5)).toThrow(RangeError);
  });

  // §4.3 and §12.2.
  it.each([-1, 1.5, 10_000, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid result %d',
    (reps) => {
      const session = createSession(targetConfig(), testDeps());

      expect(() => submitResult(session, 0, reps)).toThrow(RangeError);
    },
  );

  // §7.3: opponent results never change once shown, whatever the user enters.
  it('never changes targets, the configuration or the input session', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, offsetsArbitrary, (config, offsets) => {
        const session = deepFreeze(createSession(config, testDeps()));
        const finished = play(session, cycleOffsets(offsets));

        expect(finished.config).toEqual(session.config);
        expect(finished.stages.map(({ target }) => target)).toEqual(
          session.stages.map(({ target }) => target),
        );
      }),
    );
  });

  // Plan §8: a reload during a fight restores the same stages and carries on from the same place.
  it('survives a reload at any moment of the attempt', () => {
    fc.assert(
      fc.property(
        workoutConfigArbitrary,
        offsetsArbitrary,
        fc.nat(),
        (config, offsets, reloadPoint) => {
          const repsFor = cycleOffsets(offsets);
          let session = createSession(config, testDeps());
          const stageCount = session.stages.length;

          for (let step = 0; step < stageCount; step += 1) {
            const index = nextStageIndex(session);

            if (index === null) {
              break;
            }
            session = submitResult(session, index, repsFor(session.stages[index]!));

            if (step === reloadPoint % stageCount) {
              const restored = JSON.parse(JSON.stringify(session)) as typeof session;

              expect(restored).toEqual(session);
              expect(nextStageIndex(restored)).toBe(nextStageIndex(session));
              session = restored;
            }
          }

          expect(nextStageIndex(session)).toBeNull();
        },
      ),
    );
  });
});
