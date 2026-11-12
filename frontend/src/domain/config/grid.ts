import type { ExerciseRef } from '../catalog/exercise';
import {
  EXERCISES_MAX,
  ROUNDS_DEFAULT,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SET_REPS_DEFAULT,
  SET_REPS_MAX,
  SET_REPS_MIN,
} from './limits';
import type { FightConfig, FightExercise } from './types';

/**
 * §6: the fight as the player puts it together. The grid keeps its number of rounds apart from
 * the exercises, so its columns stay while it has no exercise at all.
 */
export interface FightGrid {
  readonly rounds: number;
  readonly exercises: readonly FightExercise[];
}

export interface GridTotals {
  // The repetitions of every exercise, in the order of the grid.
  readonly exercises: readonly number[];
  // The repetitions of every round.
  readonly rounds: readonly number[];
  readonly reps: number;
  readonly sets: number;
}

// The rounds of a fight: every exercise has as many.
export function roundsOf({ exercises }: FightConfig): number {
  return Math.max(0, ...exercises.map(({ sets }) => sets.length));
}

// The repetitions of a set stay within the limits: a step or a number beyond them stops at the edge.
export function clampReps(reps: number): number {
  return Number.isFinite(reps) ? Math.min(SET_REPS_MAX, Math.max(SET_REPS_MIN, Math.round(reps))) : SET_REPS_MIN;
}

function row({ id, name }: ExerciseRef, sets: readonly number[]): FightExercise {
  return { id, name, sets };
}

function repeated(reps: number, rounds: number): number[] {
  return Array.from({ length: rounds }, () => reps);
}

// A new player starts with the first two ready-made exercises (§5.1), so the first fight is a tap away.
export function startingGrid(readyMade: readonly ExerciseRef[]): FightGrid {
  return {
    rounds: ROUNDS_DEFAULT,
    exercises: readyMade.slice(0, 2).map((exercise) => row(exercise, repeated(SET_REPS_DEFAULT, ROUNDS_DEFAULT))),
  };
}

/**
 * The last fight of the player, so the next one starts from it. Exercises that left the catalog
 * are dropped and the rest take their current names; anything beyond the limits comes within them.
 */
export function restoreGrid(
  saved: FightConfig | null,
  catalog: readonly ExerciseRef[],
  readyMade: readonly ExerciseRef[],
): FightGrid {
  if (saved === null || saved.exercises.length === 0) {
    return startingGrid(readyMade);
  }
  const rounds = Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, ...saved.exercises.map(({ sets }) => sets.length)));
  const exercises: FightExercise[] = [];

  for (const { id, sets } of saved.exercises) {
    const current = catalog.find((exercise) => exercise.id === id);

    if (current !== undefined && exercises.length < EXERCISES_MAX && !exercises.some((exercise) => exercise.id === id)) {
      const last = sets.at(-1) ?? SET_REPS_DEFAULT;

      exercises.push(row(current, Array.from({ length: rounds }, (_, round) => clampReps(sets[round] ?? last))));
    }
  }

  return { rounds, exercises };
}

export function canAddExercise(grid: FightGrid): boolean {
  return grid.exercises.length < EXERCISES_MAX;
}

export function canAddRound(grid: FightGrid): boolean {
  return grid.rounds < ROUNDS_MAX;
}

export function canRemoveRound(grid: FightGrid): boolean {
  return grid.rounds > ROUNDS_MIN;
}

// A new exercise does the usual number of repetitions in every round. An exercise appears once.
export function addExercise(grid: FightGrid, exercise: ExerciseRef): FightGrid {
  if (!canAddExercise(grid) || grid.exercises.some(({ id }) => id === exercise.id)) {
    return grid;
  }

  return { ...grid, exercises: [...grid.exercises, row(exercise, repeated(SET_REPS_DEFAULT, grid.rounds))] };
}

export function removeExercise(grid: FightGrid, id: string): FightGrid {
  return { ...grid, exercises: grid.exercises.filter((exercise) => exercise.id !== id) };
}

// A custom exercise renamed in the catalog takes its new name in the grid as well.
export function renameExercise(grid: FightGrid, { id, name }: ExerciseRef): FightGrid {
  return { ...grid, exercises: grid.exercises.map((exercise) => (exercise.id === id ? { ...exercise, name } : exercise)) };
}

// A new round repeats the last one, so a steady fight grows by a tap.
export function addRound(grid: FightGrid): FightGrid {
  if (!canAddRound(grid)) {
    return grid;
  }

  return {
    rounds: grid.rounds + 1,
    exercises: grid.exercises.map((exercise) => ({
      ...exercise,
      sets: [...exercise.sets, exercise.sets.at(-1) ?? SET_REPS_DEFAULT],
    })),
  };
}

export function removeRound(grid: FightGrid, round: number): FightGrid {
  if (!canRemoveRound(grid) || round < 0 || round >= grid.rounds) {
    return grid;
  }

  return {
    rounds: grid.rounds - 1,
    exercises: grid.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((_, index) => index !== round),
    })),
  };
}

export function setReps(grid: FightGrid, id: string, round: number, reps: number): FightGrid {
  return {
    ...grid,
    exercises: grid.exercises.map((exercise) =>
      exercise.id === id
        ? { ...exercise, sets: exercise.sets.map((value, index) => (index === round ? clampReps(reps) : value)) }
        : exercise,
    ),
  };
}

export function gridTotals(grid: FightGrid): GridTotals {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const exercises = grid.exercises.map(({ sets }) => sum(sets));

  return {
    exercises,
    rounds: Array.from({ length: grid.rounds }, (_, round) => sum(grid.exercises.map(({ sets }) => sets[round] ?? 0))),
    reps: sum(exercises),
    sets: grid.exercises.length * grid.rounds,
  };
}

// The fight to start, or null while it has no exercise (§6).
export function toConfig(grid: FightGrid): FightConfig | null {
  return grid.exercises.length === 0
    ? null
    : { mode: 'fight', exercises: grid.exercises.map(({ id, name, sets }) => ({ id, name, sets: [...sets] })) };
}
