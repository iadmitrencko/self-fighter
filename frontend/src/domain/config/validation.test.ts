import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ladderConfig,
  opponentLevelsConfig,
  pullUps,
  pushUps,
  randomOpponentConfig,
  squats,
  targetConfig,
  workoutConfigArbitrary,
} from '../testing/fixtures';
import { EXERCISES_MAX, ROUNDS_MAX, ROUNDS_MIN, REPS_MAX } from './limits';
import type {
  LadderDraft,
  OpponentLevelsDraft,
  RandomOpponentDraft,
  TargetDraft,
  WinRule,
  WorkoutDraft,
} from './types';
import { isValidReps, parseReps, validateConfig, type ConfigError } from './validation';

function errorsOf(draft: WorkoutDraft): readonly ConfigError[] {
  const validation = validateConfig(draft);

  return validation.ok ? [] : validation.errors;
}

function codesOf(draft: WorkoutDraft): string[] {
  return errorsOf(draft).map(({ code }) => code);
}

function exercises(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `exercise-${index}`,
    name: `Вправа ${index}`,
    targets: [10, 10],
  }));
}

describe('validateConfig', () => {
  it('returns the configuration when nothing is wrong', () => {
    const config = targetConfig();

    expect(validateConfig(config)).toEqual({ ok: true, config });
  });

  it('accepts any correct configuration', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, (config) => {
        expect(validateConfig(config)).toEqual({ ok: true, config });
      }),
    );
  });

  // §11.5: no mode selected.
  it('requires a mode', () => {
    expect(codesOf({ mode: null })).toEqual(['mode-required']);
  });

  it('treats an unknown mode from stale data as not selected', () => {
    expect(codesOf({ mode: 'duel' } as unknown as WorkoutDraft)).toEqual(['mode-required']);
  });

  // Generated challenges and saved settings pass through here without the form's defaults.
  it.each([
    ['fight', targetConfig({ rule: 'exceed' as WinRule })],
    ['ladder', ladderConfig({ rule: 'exceed' as WinRule })],
  ])('rejects an unknown win rule in a %s', (_, draft) => {
    expect(codesOf(draft)).toEqual(['rule-required']);
  });

  it('reports every problem at once', () => {
    const draft: TargetDraft = { ...targetConfig(), rounds: 0, exercises: [] };

    expect(codesOf(draft)).toEqual(['exercises-required', 'rounds-out-of-range']);
  });

  describe('exercises', () => {
    // §11.5: the required number of exercises.
    it.each([
      ['target', targetConfig({ exercises: [] })],
      ['random-opponent', randomOpponentConfig({ exercises: [] })],
      ['opponent-levels', opponentLevelsConfig({ exercises: [] })],
    ])('requires at least one in %s', (_, draft) => {
      expect(codesOf(draft)).toEqual(['exercises-required']);
    });

    // §4.2: from 1 to 20 exercises.
    it('accepts the limits of the list', () => {
      expect(codesOf(targetConfig({ exercises: exercises(1) }))).toEqual([]);
      expect(codesOf(targetConfig({ exercises: exercises(EXERCISES_MAX) }))).toEqual([]);
    });

    it('rejects a list over the limit', () => {
      const draft = targetConfig({ exercises: exercises(EXERCISES_MAX + 1) });

      expect(codesOf(draft)).toEqual(['exercises-too-many']);
    });

    // §5.2: an exercise can be added to one workout only once.
    it('rejects a repeated exercise and points at it', () => {
      const draft = targetConfig({
        exercises: [
          { ...pushUps, targets: [10, 10] },
          { ...squats, targets: [10, 10] },
          { ...pushUps, targets: [20, 20] },
        ],
      });

      expect(errorsOf(draft)).toEqual([{ code: 'exercises-duplicate', exerciseId: pushUps.id }]);
    });
  });

  describe('rounds', () => {
    // §4.2: from 1 to 20 rounds.
    it.each([ROUNDS_MIN, ROUNDS_MAX])('accepts %i rounds', (rounds) => {
      const draft = randomOpponentConfig({ rounds });

      expect(codesOf(draft)).toEqual([]);
    });

    it.each([0, 21, 2.5, -1, Number.NaN, null])('rejects %s rounds', (rounds) => {
      const draft: RandomOpponentDraft = { ...randomOpponentConfig(), rounds };

      expect(codesOf(draft)).toEqual(['rounds-out-of-range']);
    });
  });

  describe('targets', () => {
    function draftWith(targets: readonly (number | null)[]): TargetDraft {
      return { ...targetConfig(), exercises: [{ ...pushUps, targets }] };
    }

    // §4.3: reps are non-negative, the limit is 9999.
    it.each([0, 1, REPS_MAX])('accepts a target of %i', (target) => {
      expect(codesOf(draftWith([target, target]))).toEqual([]);
    });

    // §4.3: an empty field is not zero. §11.5: required targets.
    it('requires a target for every round and points at the cell', () => {
      expect(errorsOf(draftWith([10, null]))).toEqual([
        { code: 'target-required', exerciseId: pushUps.id, round: 1 },
      ]);
    });

    it.each([-1, 1.5, REPS_MAX + 1, Number.NaN])('rejects a target of %d', (target) => {
      expect(errorsOf(draftWith([target, 10]))).toEqual([
        { code: 'target-invalid', exerciseId: pushUps.id, round: 0 },
      ]);
    });

    it('requires as many targets as rounds', () => {
      expect(errorsOf(draftWith([10]))).toEqual([
        { code: 'target-required', exerciseId: pushUps.id },
      ]);
      expect(errorsOf(draftWith([10, 10, 10]))).toEqual([
        { code: 'target-required', exerciseId: pushUps.id },
      ]);
    });

    it('does not check targets until the number of rounds is valid', () => {
      const draft: TargetDraft = { ...draftWith([null]), rounds: null };

      expect(codesOf(draft)).toEqual(['rounds-out-of-range']);
    });
  });

  describe('opponent range', () => {
    function draftWith(min: number | null, max: number | null): RandomOpponentDraft {
      return { ...randomOpponentConfig(), exercises: [{ ...pushUps, min, max }] };
    }

    // §4.3: both bounds from 1 to 100.
    it.each([
      [1, 100],
      [20, 40],
      [7, 7],
    ])('accepts %i–%i', (min, max) => {
      expect(codesOf(draftWith(min, max))).toEqual([]);
    });

    it.each([
      [null, 40],
      [20, null],
      [null, null],
    ])('requires both bounds, not %s–%s', (min, max) => {
      expect(errorsOf(draftWith(min, max))).toEqual([
        { code: 'opponent-range-required', exerciseId: pushUps.id },
      ]);
    });

    it.each([
      [0, 40],
      [20, 101],
      [1.5, 40],
      [20, 39.5],
    ])('rejects the bounds %d–%d', (min, max) => {
      expect(errorsOf(draftWith(min, max))).toEqual([
        { code: 'opponent-bound-invalid', exerciseId: pushUps.id },
      ]);
    });

    // §4.3: the lower bound cannot exceed the upper one.
    it('rejects an inverted range', () => {
      expect(errorsOf(draftWith(41, 40))).toEqual([
        { code: 'opponent-range-inverted', exerciseId: pushUps.id },
      ]);
    });

    it('checks each exercise on its own', () => {
      const draft: RandomOpponentDraft = {
        ...randomOpponentConfig(),
        exercises: [
          { ...pushUps, min: 1, max: 2 },
          { ...squats, min: null, max: 2 },
        ],
      };

      expect(errorsOf(draft)).toEqual([
        { code: 'opponent-range-required', exerciseId: squats.id },
      ]);
    });
  });

  describe('opponent levels', () => {
    function draftWith(upperBound: number | null): OpponentLevelsDraft {
      return { ...opponentLevelsConfig(), exercises: [{ ...pushUps, upperBound }] };
    }

    // §8.2: the upper bound is from 1 to 100.
    it.each([1, 100])('accepts an upper bound of %i', (upperBound) => {
      expect(codesOf(draftWith(upperBound))).toEqual([]);
    });

    it('requires an upper bound', () => {
      expect(errorsOf(draftWith(null))).toEqual([
        { code: 'upper-bound-required', exerciseId: pushUps.id },
      ]);
    });

    it.each([0, 101, 1.5])('rejects an upper bound of %d', (upperBound) => {
      expect(errorsOf(draftWith(upperBound))).toEqual([
        { code: 'upper-bound-invalid', exerciseId: pushUps.id },
      ]);
    });

    it('requires a difficulty', () => {
      const draft: OpponentLevelsDraft = { ...opponentLevelsConfig(), difficulty: null };

      expect(codesOf(draft)).toEqual(['difficulty-required']);
    });
  });

  describe('ladder', () => {
    function draftWith(max: number | null): LadderDraft {
      return { ...ladderConfig(), max };
    }

    // §4.2: a ladder uses exactly one exercise.
    it('requires an exercise', () => {
      expect(codesOf({ ...ladderConfig(), exercise: null })).toEqual(['exercises-required']);
    });

    // §9.2: a positive integer up to the technical limit of 100.
    it.each([1, 100])('accepts a maximum of %i', (max) => {
      expect(codesOf(draftWith(max))).toEqual([]);
    });

    it('requires a maximum', () => {
      expect(codesOf(draftWith(null))).toEqual(['ladder-max-required']);
    });

    it.each([0, -1, 101, 2.5])('rejects a maximum of %d', (max) => {
      expect(codesOf(draftWith(max))).toEqual(['ladder-max-invalid']);
    });

    it('keeps the exercise of the ladder in the configuration', () => {
      const validation = validateConfig(ladderConfig());

      expect(validation).toMatchObject({ ok: true, config: { exercise: pullUps } });
    });
  });
});

describe('isValidReps', () => {
  it.each([0, 1, REPS_MAX])('accepts %i', (reps) => {
    expect(isValidReps(reps)).toBe(true);
  });

  it.each([-1, 0.5, REPS_MAX + 1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %d', (reps) => {
    expect(isValidReps(reps)).toBe(false);
  });
});

describe('parseReps', () => {
  // §12.2: zero is a result, an empty field is not.
  it.each([
    ['0', 0],
    ['7', 7],
    ['0035', 35],
    [' 12 ', 12],
    ['9999', 9999],
  ])('reads %j as %i', (input, expected) => {
    expect(parseReps(input)).toBe(expected);
  });

  it.each(['', '   ', '-1', '+5', '1.5', '1,5', '1e3', '0x10', 'десять', '10000', '٣'])(
    'rejects %j',
    (input) => {
      expect(parseReps(input)).toBeNull();
    },
  );

  it('never returns an invalid number', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const reps = parseReps(input);

        expect(reps === null || isValidReps(reps)).toBe(true);
      }),
    );
  });
});
