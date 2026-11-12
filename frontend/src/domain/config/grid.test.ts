import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deepFreeze, fightConfig, fightConfigArbitrary, pullUps, pushUps, squats } from '../testing/fixtures';
import {
  addExercise,
  addRound,
  canAddExercise,
  canAddRound,
  canRemoveRound,
  clampReps,
  gridTotals,
  removeExercise,
  removeRound,
  renameExercise,
  restoreGrid,
  setReps,
  startingGrid,
  toConfig,
  type FightGrid,
} from './grid';
import { EXERCISES_MAX, ROUNDS_MAX, SET_REPS_MAX } from './limits';

const READY_MADE = [pushUps, squats, pullUps];

// The grid of the mockup: push-ups and squats in three rounds.
const grid: FightGrid = deepFreeze({
  rounds: 3,
  exercises: [
    { ...pushUps, sets: [15, 12, 10] },
    { ...squats, sets: [20, 20, 20] },
  ],
});

describe('the grid of a fight', () => {
  // A new player starts with the first ready-made exercises, ten repetitions in three rounds.
  it('starts from the first ready-made exercises', () => {
    expect(startingGrid(READY_MADE)).toEqual({
      rounds: 3,
      exercises: [
        { ...pushUps, sets: [10, 10, 10] },
        { ...squats, sets: [10, 10, 10] },
      ],
    });
  });

  it('adds an exercise with the usual repetitions in every round, once', () => {
    const added = addExercise(grid, pullUps);

    expect(added.exercises.at(-1)).toEqual({ ...pullUps, sets: [10, 10, 10] });
    expect(addExercise(added, pullUps)).toBe(added);
  });

  it('takes no more exercises than the limit', () => {
    let full: FightGrid = { rounds: 1, exercises: [] };

    for (let index = 0; index < EXERCISES_MAX + 3; index += 1) {
      full = addExercise(full, { id: `exercise-${index}`, name: `Вправа ${index}` });
    }

    expect(full.exercises).toHaveLength(EXERCISES_MAX);
    expect(canAddExercise(full)).toBe(false);
  });

  it('removes an exercise and renames one', () => {
    expect(removeExercise(grid, 'push-ups').exercises.map(({ id }) => id)).toEqual(['squats']);
    expect(renameExercise(grid, { id: 'squats', name: 'Глибокі присідання' }).exercises[1]?.name).toBe('Глибокі присідання');
  });

  // A new round repeats the last one.
  it('adds a round like the last one, up to the limit', () => {
    expect(addRound(grid)).toEqual({
      rounds: 4,
      exercises: [
        { ...pushUps, sets: [15, 12, 10, 10] },
        { ...squats, sets: [20, 20, 20, 20] },
      ],
    });

    let full = grid;

    for (let round = 0; round < ROUNDS_MAX; round += 1) {
      full = addRound(full);
    }

    expect(full.rounds).toBe(ROUNDS_MAX);
    expect(canAddRound(full)).toBe(false);
    // A row with no sets yet takes the usual repetitions.
    expect(addRound({ rounds: 1, exercises: [{ ...pullUps, sets: [] }] }).exercises[0]?.sets).toEqual([10]);
  });

  it('removes any round but the last one left', () => {
    expect(removeRound(grid, 1)).toEqual({
      rounds: 2,
      exercises: [
        { ...pushUps, sets: [15, 10] },
        { ...squats, sets: [20, 20] },
      ],
    });

    const single = removeRound(removeRound(grid, 0), 0);

    expect(single.rounds).toBe(1);
    expect(canRemoveRound(single)).toBe(false);
    expect(removeRound(single, 0)).toBe(single);
    // A round the grid does not have changes nothing.
    expect(removeRound(grid, 3)).toBe(grid);
    expect(removeRound(grid, -1)).toBe(grid);
  });

  it('keeps its columns without exercises', () => {
    const empty = removeExercise(removeExercise(grid, 'push-ups'), 'squats');

    expect(empty).toEqual({ rounds: 3, exercises: [] });
    expect(addExercise(empty, pullUps).exercises).toEqual([{ ...pullUps, sets: [10, 10, 10] }]);
  });

  // §6: a set takes from 1 to 999 repetitions.
  it('keeps the repetitions of a set within the limits', () => {
    expect(setReps(grid, 'squats', 2, 25).exercises[1]?.sets).toEqual([20, 20, 25]);
    expect(setReps(grid, 'squats', 2, 0).exercises[1]?.sets).toEqual([20, 20, 1]);
    expect(setReps(grid, 'squats', 2, 5000).exercises[1]?.sets).toEqual([20, 20, SET_REPS_MAX]);
    expect([clampReps(2.6), clampReps(Number.NaN), clampReps(-4)]).toEqual([3, 1, 1]);
  });

  it('sums the repetitions of every exercise and of every round', () => {
    expect(gridTotals(grid)).toEqual({ exercises: [37, 60], rounds: [35, 32, 30], reps: 97, sets: 6 });
    // A row shorter than the grid counts nothing in the rounds it lacks.
    expect(gridTotals({ rounds: 2, exercises: [{ ...pushUps, sets: [5] }] }).rounds).toEqual([5, 0]);
  });

  it('starts a fight only with an exercise', () => {
    expect(toConfig(grid)).toEqual({
      mode: 'fight',
      exercises: [
        { ...pushUps, sets: [15, 12, 10] },
        { ...squats, sets: [20, 20, 20] },
      ],
    });
    expect(toConfig({ rounds: 3, exercises: [] })).toBeNull();
  });
});

describe('the last fight of the player', () => {
  it('comes back as it was', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, (config) => {
        const catalog = config.exercises.map(({ id, name }) => ({ id, name }));

        expect(toConfig(restoreGrid(config, catalog, READY_MADE))).toEqual(config);
      }),
    );
  });

  // §5.3: an exercise that left the catalog leaves the fight, a renamed one takes its new name.
  it('follows the catalog', () => {
    const restored = restoreGrid(fightConfig(), [{ id: 'squats', name: 'Глибокі присідання' }], READY_MADE);

    expect(restored).toEqual({ rounds: 3, exercises: [{ id: 'squats', name: 'Глибокі присідання', sets: [15, 15, 20] }] });
  });

  // The server keeps what the schema allows, so the grid makes the rest whole.
  it('comes back within the limits and the rules of the grid', () => {
    const many = Array.from({ length: EXERCISES_MAX + 2 }, (_, index) => ({ id: `exercise-${index}`, name: `Вправа ${index}`, sets: [5] }));
    const saved = {
      mode: 'fight' as const,
      exercises: [
        { ...pushUps, sets: [12, 1000, 0] },
        { ...pushUps, sets: [7] },
        { ...squats, sets: [8] },
        { ...pullUps, sets: [] },
        ...many,
      ],
    };
    const restored = restoreGrid(saved, [pushUps, squats, pullUps, ...many], READY_MADE);

    expect(restored.rounds).toBe(3);
    expect(restored.exercises.slice(0, 3)).toEqual([
      { ...pushUps, sets: [12, SET_REPS_MAX, 1] },
      { ...squats, sets: [8, 8, 8] },
      { ...pullUps, sets: [10, 10, 10] },
    ]);
    expect(restored.exercises).toHaveLength(EXERCISES_MAX);
  });

  it('gives a new player the starting grid', () => {
    expect(restoreGrid(null, READY_MADE, READY_MADE)).toEqual(startingGrid(READY_MADE));
  });
});
