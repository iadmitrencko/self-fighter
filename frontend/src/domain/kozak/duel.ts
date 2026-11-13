import type { ExerciseRef } from '../catalog/exercise';
import type { DuelConfig } from '../config/types';
import type { DuelAttempt } from '../history/attempt';
import type { Status } from './progress';

/**
 * §24.9: the final battle of the journey, a duel with the King of robbers. The King has 100
 * health, and each of the five rounds can take 20 of it. A round goes as a circuit, the first set
 * of every exercise and then the second, as a fight does (§6). The player may stop at any set: the
 * damage done stays, and the next battle goes on from the first set not done yet.
 */

export const KING_HEALTH = 100;
const ROUND_DAMAGE = 20;

// The sets of one exercise of a round.
export interface DuelExercise {
  // A ready-made exercise of the site (§5.1) by its id.
  readonly exercise: string;
  readonly sets: readonly number[];
}

export interface DuelRound {
  // final-battle/1/N, as the levels of the journey are named. Attempts keep it, so it never changes.
  readonly id: string;
  readonly number: number;
  readonly exercises: readonly DuelExercise[];
}

export interface DuelDefinition {
  readonly health: number;
  readonly rounds: readonly DuelRound[];
}

// A set of a round in its place in the circuit.
export interface RoundSet {
  readonly position: number;
  readonly exercise: string;
  readonly reps: number;
}

// The King looks worse with every quarter of his health gone.
export type KingStage = 'unbroken' | 'wounded' | 'enraged' | 'last-breath' | 'defeated';

export interface RoundProgress {
  readonly round: DuelRound;
  readonly sets: readonly RoundSet[];
  // The places of the sets done, in order.
  readonly done: readonly number[];
  readonly damage: number;
  readonly status: Status;
  // The place the next battle of the round starts from, or null once every set is done.
  readonly next: number | null;
}

export interface DuelProgress {
  readonly rounds: readonly RoundProgress[];
  readonly health: number;
  readonly stage: KingStage;
  // The round to fight now, or null while the duel is closed or once the King is defeated.
  readonly current: RoundProgress | null;
}

// The places of the sets done, by the round.
export type DuelDone = Readonly<Record<string, readonly number[]>>;

const round = (number: number, exercises: readonly (readonly [exercise: string, scheme: string])[]): DuelRound => ({
  id: `final-battle/1/${number}`,
  number,
  exercises: exercises.map(([exercise, scheme]) => ({ exercise, sets: scheme.split('-').map(Number) })),
});

// §24.9: the five rounds of the brief: one exercise of each campaign, then all three together.
export const DUEL: DuelDefinition = {
  health: KING_HEALTH,
  rounds: [
    round(1, [['push-ups', '15-20-25']]),
    round(2, [['squats', '30-35-40-45']]),
    round(3, [['pull-ups', '5-7-8-10']]),
    round(4, [
      ['push-ups', '15-20-25'],
      ['squats', '25-30-35'],
      ['pull-ups', '5-7-8'],
    ]),
    round(5, [
      ['push-ups', '20-25-25'],
      ['squats', '30-35-40-50'],
      ['pull-ups', '6-8-10'],
    ]),
  ],
};

// The sets of a round in the order of the circuit.
export function roundSets({ exercises }: DuelRound): RoundSet[] {
  const circuits = Math.max(...exercises.map(({ sets }) => sets.length));

  return Array.from({ length: circuits }, (_, circuit) =>
    exercises.flatMap(({ exercise, sets }) => {
      const reps = sets[circuit];

      return reps === undefined ? [] : [{ exercise, reps }];
    }),
  )
    .flat()
    .map((set, position) => ({ position, ...set }));
}

export function roundReps(round: DuelRound): number {
  return round.exercises.reduce((total, { sets }) => sets.reduce((sum, reps) => sum + reps, total), 0);
}

/**
 * The damage the sets done of a round deal. Every exercise of the round deals an equal part of its
 * 20 by the share of its repetitions done. The King loses whole units only, rounded down, so a
 * round deals all 20 once every set is done, and never before.
 */
export function damageOf(round: DuelRound, done: ReadonlySet<number>): number {
  const sets = roundSets(round);
  // The shares are fractions over the product of the totals, so the count stays exact.
  const totals = round.exercises.map(({ sets: reps }) => reps.reduce((sum, value) => sum + value, 0));
  const product = totals.reduce((result, total) => result * total, 1);
  const shares = round.exercises.reduce((sum, { exercise }, index) => {
    const reps = sets.filter((set) => set.exercise === exercise && done.has(set.position)).reduce((total, set) => total + set.reps, 0);

    return sum + reps * (product / (totals[index] as number));
  }, 0);

  return Math.floor((ROUND_DAMAGE * shares) / (round.exercises.length * product));
}

export function kingStage(health: number): KingStage {
  if (health <= 0) {
    return 'defeated';
  }
  if (health <= 25) {
    return 'last-breath';
  }
  if (health <= 50) {
    return 'enraged';
  }

  return health <= 75 ? 'wounded' : 'unbroken';
}

/**
 * The duel by the sets done. The rounds open one after another: the first round not finished is
 * the current one. Sets done stay done, whatever battle did them, so the order of the history does
 * not matter.
 */
export function duelProgress(duel: DuelDefinition, done: DuelDone, open: boolean): DuelProgress {
  let previousDone = open;
  const rounds = duel.rounds.map((item): RoundProgress => {
    const sets = roundSets(item);
    const places = new Set((done[item.id] ?? []).filter((place) => place >= 0 && place < sets.length));
    const next = sets.find(({ position }) => !places.has(position))?.position ?? null;
    const status: Status = !previousDone ? 'locked' : next === null ? 'done' : 'current';
    previousDone = status === 'done';

    return {
      round: item,
      sets,
      done: [...places].sort((a, b) => a - b),
      damage: open ? damageOf(item, places) : 0,
      status,
      next,
    };
  });
  const health = Math.max(0, duel.health - rounds.reduce((total, { damage }) => total + damage, 0));

  return {
    rounds,
    health,
    stage: kingStage(health),
    current: rounds.find(({ status }) => status === 'current') ?? null,
  };
}

// A battle of a round goes on from its first set not done yet. The catalog of the site names the exercises.
export function duelConfig(progress: RoundProgress, exercises: readonly ExerciseRef[]): DuelConfig | null {
  const { next } = progress;

  if (next === null) {
    return null;
  }
  const exerciseOf = (id: string): ExerciseRef => exercises.find((exercise) => exercise.id === id) ?? { id, name: id };

  return {
    mode: 'duel',
    round: progress.round.id,
    from: next,
    sets: progress.sets.slice(next).map(({ exercise, reps }) => ({ exercise: exerciseOf(exercise), reps })),
  };
}

// The places in its round of the sets a battle of the duel has done.
export function donePlaces({ config, result }: DuelAttempt): number[] {
  return result.sets.flatMap(({ done }, index) => (done ? [config.from + index] : []));
}

// Two sources may know of different battles of the duel: a set done in any of them stays done.
export function addDuelDone(a: DuelDone, b: DuelDone): DuelDone {
  return Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .sort()
      .map((id) => [id, [...new Set([...(a[id] ?? []), ...(b[id] ?? [])])].sort((x, y) => x - y)]),
  );
}

export function findRound(duel: DuelDefinition, id: string): DuelRound | null {
  return duel.rounds.find((item) => item.id === id) ?? null;
}
