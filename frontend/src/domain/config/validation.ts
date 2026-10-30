import {
  EXERCISES_MAX,
  LADDER_MAX,
  OPPONENT_BOUND_MAX,
  OPPONENT_BOUND_MIN,
  REPS_MAX,
  ROUNDS_MAX,
  ROUNDS_MIN,
} from './limits';
import type {
  Difficulty,
  LadderDraft,
  OpponentLevelsDraft,
  RandomOpponentDraft,
  TargetDraft,
  WinRule,
  WorkoutConfig,
  WorkoutDraft,
} from './types';

export type ConfigErrorCode =
  | 'mode-required'
  | 'rule-required'
  | 'exercises-required'
  | 'exercises-too-many'
  | 'exercises-duplicate'
  | 'rounds-out-of-range'
  | 'target-required'
  | 'target-invalid'
  | 'opponent-range-required'
  | 'opponent-bound-invalid'
  | 'opponent-range-inverted'
  | 'upper-bound-required'
  | 'upper-bound-invalid'
  | 'difficulty-required'
  | 'ladder-max-required'
  | 'ladder-max-invalid';

// exerciseId and round point the form at the field to fix.
export interface ConfigError {
  readonly code: ConfigErrorCode;
  readonly exerciseId?: string;
  readonly round?: number;
}

export type ConfigValidation =
  | { readonly ok: true; readonly config: WorkoutConfig }
  | { readonly ok: false; readonly errors: readonly ConfigError[] };

const WIN_RULES: readonly WinRule[] = ['over', 'meet'];
const DIFFICULTIES: readonly (Difficulty | null)[] = ['easy', 'medium', 'hard'];

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function isValidReps(value: number): boolean {
  return isIntegerInRange(value, 0, REPS_MAX);
}

// Returns null for anything that is not a whole number of repetitions (§12.2).
export function parseReps(input: string): number | null {
  const text = input.trim();
  const value = Number(text);

  return /^\d+$/.test(text) && isValidReps(value) ? value : null;
}

function ruleErrors(rule: WinRule): ConfigError[] {
  return WIN_RULES.includes(rule) ? [] : [{ code: 'rule-required' }];
}

type FightDraft = TargetDraft | RandomOpponentDraft | OpponentLevelsDraft;

function exerciseListErrors({ exercises }: FightDraft): ConfigError[] {
  const errors: ConfigError[] = [];

  if (exercises.length === 0) {
    errors.push({ code: 'exercises-required' });
  }
  if (exercises.length > EXERCISES_MAX) {
    errors.push({ code: 'exercises-too-many' });
  }
  exercises.forEach(({ id }, index) => {
    if (exercises.findIndex((exercise) => exercise.id === id) !== index) {
      errors.push({ code: 'exercises-duplicate', exerciseId: id });
    }
  });

  return errors;
}

function hasValidRounds(rounds: number | null): rounds is number {
  return rounds !== null && isIntegerInRange(rounds, ROUNDS_MIN, ROUNDS_MAX);
}

function fightErrors(draft: FightDraft): ConfigError[] {
  return [
    ...exerciseListErrors(draft),
    ...ruleErrors(draft.rule),
    ...(hasValidRounds(draft.rounds) ? [] : [{ code: 'rounds-out-of-range' } as const]),
  ];
}

function targetErrors({ exercises, rounds }: TargetDraft): ConfigError[] {
  // The grid has no fixed size until the number of rounds is valid.
  if (!hasValidRounds(rounds)) {
    return [];
  }

  return exercises.flatMap(({ id: exerciseId, targets }) => {
    if (targets.length !== rounds) {
      return [{ code: 'target-required', exerciseId }];
    }

    return targets.flatMap((target, round): ConfigError[] => {
      if (target === null) {
        return [{ code: 'target-required', exerciseId, round }];
      }

      return isValidReps(target) ? [] : [{ code: 'target-invalid', exerciseId, round }];
    });
  });
}

function isOpponentBound(value: number): boolean {
  return isIntegerInRange(value, OPPONENT_BOUND_MIN, OPPONENT_BOUND_MAX);
}

function opponentRangeErrors({ exercises }: RandomOpponentDraft): ConfigError[] {
  return exercises.flatMap(({ id: exerciseId, min, max }): ConfigError[] => {
    if (min === null || max === null) {
      return [{ code: 'opponent-range-required', exerciseId }];
    }
    if (!isOpponentBound(min) || !isOpponentBound(max)) {
      return [{ code: 'opponent-bound-invalid', exerciseId }];
    }

    return min > max ? [{ code: 'opponent-range-inverted', exerciseId }] : [];
  });
}

function upperBoundErrors({ exercises }: OpponentLevelsDraft): ConfigError[] {
  return exercises.flatMap(({ id: exerciseId, upperBound }): ConfigError[] => {
    if (upperBound === null) {
      return [{ code: 'upper-bound-required', exerciseId }];
    }

    return isOpponentBound(upperBound) ? [] : [{ code: 'upper-bound-invalid', exerciseId }];
  });
}

function difficultyErrors({ difficulty }: OpponentLevelsDraft): ConfigError[] {
  return DIFFICULTIES.includes(difficulty) ? [] : [{ code: 'difficulty-required' }];
}

function ladderMaxErrors({ max }: LadderDraft): ConfigError[] {
  if (max === null) {
    return [{ code: 'ladder-max-required' }];
  }

  return isIntegerInRange(max, 1, LADDER_MAX) ? [] : [{ code: 'ladder-max-invalid' }];
}

function ladderErrors(draft: LadderDraft): ConfigError[] {
  return [
    ...(draft.exercise === null ? [{ code: 'exercises-required' } as const] : []),
    ...ruleErrors(draft.rule),
    ...ladderMaxErrors(draft),
  ];
}

function findErrors(draft: WorkoutDraft): ConfigError[] {
  switch (draft.mode) {
    case 'target':
      return [...fightErrors(draft), ...targetErrors(draft)];
    case 'random-opponent':
      return [...fightErrors(draft), ...opponentRangeErrors(draft)];
    case 'opponent-levels':
      return [...fightErrors(draft), ...difficultyErrors(draft), ...upperBoundErrors(draft)];
    case 'ladder':
      return ladderErrors(draft);
    default:
      return [{ code: 'mode-required' }];
  }
}

// The only way from a form to a configuration, shared with generated challenges (§11.5, §21.3).
export function validateConfig(draft: WorkoutDraft): ConfigValidation {
  const errors = findErrors(draft);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, config: draft as WorkoutConfig };
}
