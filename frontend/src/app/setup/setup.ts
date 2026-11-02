import type { ExerciseRef } from '../../domain/catalog/exercise';
import {
  columnTargets,
  createTargetColumn,
  ensureRounds,
  fillAllRounds,
  setRoundTarget,
  type TargetColumn,
} from '../../domain/config/autofill';
import { EXERCISES_MAX, ROUNDS_DEFAULT, ROUNDS_MAX, ROUNDS_MIN } from '../../domain/config/limits';
import type {
  Difficulty,
  Mode,
  WinRule,
  WorkoutConfig,
  WorkoutDraft,
} from '../../domain/config/types';

export interface OpponentRange {
  readonly min: number | null;
  readonly max: number | null;
}

// Everything the setup form holds. Values of an exercise outlive its removal, so adding it back
// within the same setup returns its targets.
export interface SetupState {
  readonly mode: Mode;
  readonly rule: WinRule;
  readonly rounds: number;
  readonly exercises: readonly ExerciseRef[];
  readonly targets: Readonly<Record<string, TargetColumn>>;
  readonly ranges: Readonly<Record<string, OpponentRange>>;
  readonly bounds: Readonly<Record<string, number | null>>;
  readonly difficulty: Difficulty;
  readonly ladderMax: number | null;
  readonly returnDown: boolean;
}

export const LADDER_MAX_DEFAULT = 5;

export function emptySetup(mode: Mode): SetupState {
  return {
    mode,
    // §4.4: «Перевиконати» unless the player picks otherwise.
    rule: 'over',
    rounds: ROUNDS_DEFAULT,
    exercises: [],
    targets: {},
    ranges: {},
    bounds: {},
    difficulty: 'medium',
    ladderMax: LADDER_MAX_DEFAULT,
    returnDown: false,
  };
}

// A saved column has no marks, so a round that differs from the first counts as set by hand.
function restoreColumn(targets: readonly number[]): TargetColumn {
  const first = targets[0] ?? null;

  return targets.map((value, round) => ({ value, manual: round > 0 && value !== first }));
}

/**
 * The last configuration of the mode, so the next workout starts from it. Exercises that left
 * the catalog are dropped, the rest take their current names.
 */
export function restoreSetup(
  mode: Mode,
  saved: WorkoutConfig | null,
  catalog: readonly ExerciseRef[],
): SetupState {
  const setup = emptySetup(mode);

  if (saved === null || saved.mode !== mode) {
    return setup;
  }
  const current = ({ id }: ExerciseRef) => {
    const found = catalog.find((exercise) => exercise.id === id);

    return found === undefined ? [] : [{ id: found.id, name: found.name }];
  };

  if (saved.mode === 'ladder') {
    return {
      ...setup,
      rule: saved.rule,
      exercises: current(saved.exercise),
      ladderMax: saved.max,
      returnDown: saved.returnDown,
    };
  }
  const base = { ...setup, rule: saved.rule, rounds: saved.rounds };

  switch (saved.mode) {
    case 'target': {
      const kept = saved.exercises.filter((exercise) => current(exercise).length > 0);

      return {
        ...base,
        exercises: kept.flatMap(current),
        targets: Object.fromEntries(kept.map(({ id, targets }) => [id, restoreColumn(targets)])),
      };
    }
    case 'random-opponent': {
      const kept = saved.exercises.filter((exercise) => current(exercise).length > 0);

      return {
        ...base,
        exercises: kept.flatMap(current),
        ranges: Object.fromEntries(kept.map(({ id, min, max }) => [id, { min, max }])),
      };
    }
    case 'opponent-levels': {
      const kept = saved.exercises.filter((exercise) => current(exercise).length > 0);

      return {
        ...base,
        difficulty: saved.difficulty,
        exercises: kept.flatMap(current),
        bounds: Object.fromEntries(kept.map(({ id, upperBound }) => [id, upperBound])),
      };
    }
  }
}

// The ladder takes one exercise, so picking another replaces it (§9.2).
export function addExercise(setup: SetupState, { id, name }: ExerciseRef): SetupState {
  if (setup.mode === 'ladder') {
    return { ...setup, exercises: [{ id, name }] };
  }
  if (setup.exercises.some((exercise) => exercise.id === id) || setup.exercises.length >= EXERCISES_MAX) {
    return setup;
  }

  return {
    ...setup,
    exercises: [...setup.exercises, { id, name }],
    targets: { ...setup.targets, [id]: column(setup, id) },
  };
}

export function removeExercise(setup: SetupState, id: string): SetupState {
  return { ...setup, exercises: setup.exercises.filter((exercise) => exercise.id !== id) };
}

// A renamed custom exercise keeps its place and its values.
export function renameExercise(setup: SetupState, { id, name }: ExerciseRef): SetupState {
  return {
    ...setup,
    exercises: setup.exercises.map((exercise) => (exercise.id === id ? { id, name } : exercise)),
  };
}

export function setRounds(setup: SetupState, rounds: number): SetupState {
  const clamped = Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, rounds));

  return {
    ...setup,
    rounds: clamped,
    targets: Object.fromEntries(
      Object.entries(setup.targets).map(([id, column]) => [id, ensureRounds(column, clamped)]),
    ),
  };
}

function column(setup: SetupState, id: string): TargetColumn {
  return ensureRounds(setup.targets[id] ?? createTargetColumn(setup.rounds), setup.rounds);
}

export function setTarget(
  setup: SetupState,
  id: string,
  round: number,
  value: number | null,
): SetupState {
  return {
    ...setup,
    targets: { ...setup.targets, [id]: setRoundTarget(column(setup, id), round, value) },
  };
}

export function fillTargets(setup: SetupState, id: string): SetupState {
  return { ...setup, targets: { ...setup.targets, [id]: fillAllRounds(column(setup, id)) } };
}

export function targetsOf(setup: SetupState, id: string): TargetColumn {
  return column(setup, id).slice(0, setup.rounds);
}

export function setRange(
  setup: SetupState,
  id: string,
  bound: keyof OpponentRange,
  value: number | null,
): SetupState {
  const range = setup.ranges[id] ?? { min: null, max: null };

  return { ...setup, ranges: { ...setup.ranges, [id]: { ...range, [bound]: value } } };
}

export function setBound(setup: SetupState, id: string, value: number | null): SetupState {
  return { ...setup, bounds: { ...setup.bounds, [id]: value } };
}

// The form as the domain validates it (§11.5). Exercises keep only what an attempt remembers.
export function toDraft(setup: SetupState): WorkoutDraft {
  const { mode, rule, rounds, exercises } = setup;

  switch (mode) {
    case 'target':
      return {
        mode,
        rule,
        rounds,
        exercises: exercises.map(({ id, name }) => ({
          id,
          name,
          targets: columnTargets(column(setup, id), rounds),
        })),
      };
    case 'random-opponent':
      return {
        mode,
        rule,
        rounds,
        exercises: exercises.map(({ id, name }) => ({
          id,
          name,
          min: setup.ranges[id]?.min ?? null,
          max: setup.ranges[id]?.max ?? null,
        })),
      };
    case 'opponent-levels':
      return {
        mode,
        rule,
        rounds,
        difficulty: setup.difficulty,
        exercises: exercises.map(({ id, name }) => ({
          id,
          name,
          upperBound: setup.bounds[id] ?? null,
        })),
      };
    case 'ladder':
      return {
        mode,
        rule,
        exercise: exercises[0] ?? null,
        max: setup.ladderMax,
        returnDown: setup.returnDown,
      };
  }
}
