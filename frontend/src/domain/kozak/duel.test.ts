import { describe, expect, it } from 'vitest';
import { pullUps, pushUps, squats } from '../testing/fixtures';
import {
  addDuelDone,
  damageOf,
  DUEL,
  duelConfig,
  duelProgress,
  findRound,
  KING_HEALTH,
  kingStage,
  roundReps,
  roundSets,
  type DuelRound,
} from './duel';

const roundOf = (number: number): DuelRound => DUEL.rounds[number - 1] as DuelRound;
const places = (...list: number[]) => new Set(list);
// Every set of the given rounds done.
const allOf = (...numbers: number[]) =>
  Object.fromEntries(numbers.map((number) => [roundOf(number).id, roundSets(roundOf(number)).map(({ position }) => position)]));

describe('the duel with the King', () => {
  // §24.9: five rounds of the brief, 659 repetitions of the three exercises of the journey.
  it('has the rounds of the brief', () => {
    expect(DUEL.health).toBe(KING_HEALTH);
    expect(DUEL.rounds.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5].map((number) => `final-battle/1/${number}`));
    expect(DUEL.rounds.map(roundReps)).toEqual([60, 150, 30, 170, 249]);

    const total = (exercise: string) =>
      DUEL.rounds.flatMap(({ exercises }) => exercises).filter((item) => item.exercise === exercise).flatMap(({ sets }) => sets).reduce((sum, reps) => sum + reps, 0);

    expect([total('push-ups'), total('squats'), total('pull-ups')]).toEqual([190, 395, 74]);
  });

  // The circuit: the first set of every exercise, then the second, as a fight goes.
  it('goes round by round through the exercises', () => {
    expect(roundSets(roundOf(5)).map(({ exercise, reps }) => `${exercise} ${reps}`)).toEqual([
      'push-ups 20',
      'squats 30',
      'pull-ups 6',
      'push-ups 25',
      'squats 35',
      'pull-ups 8',
      'push-ups 25',
      'squats 40',
      'pull-ups 10',
      'squats 50',
    ]);
    expect(roundSets(roundOf(1)).map(({ position }) => position)).toEqual([0, 1, 2]);
  });

  // §24.9: the share of the repetitions done, and an equal share for every exercise of a round.
  it('deals the damage of the repetitions done', () => {
    expect(damageOf(roundOf(1), places())).toBe(0);
    // 15 and 20 of 60 push-ups: 11.7 rounded down.
    expect(damageOf(roundOf(1), places(0, 1))).toBe(11);
    expect(damageOf(roundOf(1), places(0, 1, 2))).toBe(20);
    // Round 4: every push-up is a third of the round, and 25 of 90 squats a bit of another third.
    expect(damageOf(roundOf(4), places(0, 3, 6))).toBe(6);
    expect(damageOf(roundOf(4), places(0, 1, 3, 6))).toBe(8);
    // The pull-ups weigh as much as the squats.
    expect(damageOf(roundOf(4), places(2, 5, 8))).toBe(6);
    expect(damageOf(roundOf(5), places(...roundSets(roundOf(5)).map(({ position }) => position)))).toBe(20);
    // One set of 50 squats short of the end: 105 of 155 squats, 17.8 rounded down.
    expect(damageOf(roundOf(5), places(0, 1, 2, 3, 4, 5, 6, 7, 8))).toBe(17);
  });

  // §24.9: 100–76, 75–51, 50–26, 25–1 and 0.
  it('shows the King worse with every quarter of his health', () => {
    expect([100, 76, 75, 51, 50, 26, 25, 1, 0].map(kingStage)).toEqual([
      'unbroken',
      'unbroken',
      'wounded',
      'wounded',
      'enraged',
      'enraged',
      'last-breath',
      'last-breath',
      'defeated',
    ]);
  });

  it('opens the rounds one after another and goes on from the first set not done', () => {
    const fresh = duelProgress(DUEL, {}, true);

    expect(fresh.rounds.map(({ status }) => status)).toEqual(['current', 'locked', 'locked', 'locked', 'locked']);
    expect(fresh).toMatchObject({ health: 100, stage: 'unbroken', current: { next: 0 } });

    const going = duelProgress(DUEL, { ...allOf(1), [roundOf(2).id]: [0, 1] }, true);

    expect(going.rounds.map(({ status }) => status)).toEqual(['done', 'current', 'locked', 'locked', 'locked']);
    expect(going.current?.round.number).toBe(2);
    expect(going.current?.next).toBe(2);
    // 20 for the first round and 65 of 150 squats of the second.
    expect(going.health).toBe(72);
    expect(going.stage).toBe('wounded');
  });

  it('is won once every set of every round is done', () => {
    const won = duelProgress(DUEL, allOf(1, 2, 3, 4, 5), true);

    expect(won).toMatchObject({ health: 0, stage: 'defeated', current: null });
    expect(won.rounds.every(({ status, damage }) => status === 'done' && damage === 20)).toBe(true);
  });

  // The duel waits for the three campaigns, and places that are not in a round count for nothing.
  it('counts nothing while it is closed or for places out of the round', () => {
    expect(duelProgress(DUEL, allOf(1), false)).toMatchObject({ health: 100, current: null });
    expect(duelProgress(DUEL, { [roundOf(1).id]: [-1, 3, 7] }, true).health).toBe(100);
  });

  it('puts together a battle of the sets left', () => {
    const progress = duelProgress(DUEL, { [roundOf(4).id]: [0, 1, 2] }, true).rounds[3];

    expect(duelConfig(progress ?? (undefined as never), [pushUps, squats, pullUps])).toEqual({
      mode: 'duel',
      round: 'final-battle/1/4',
      from: 3,
      sets: [
        { exercise: pushUps, reps: 20 },
        { exercise: squats, reps: 30 },
        { exercise: pullUps, reps: 7 },
        { exercise: pushUps, reps: 25 },
        { exercise: squats, reps: 35 },
        { exercise: pullUps, reps: 8 },
      ],
    });
    // An exercise the catalog does not know keeps its id as the name.
    expect(duelConfig(duelProgress(DUEL, {}, true).rounds[0] ?? (undefined as never), [])?.sets[0]?.exercise).toEqual({
      id: 'push-ups',
      name: 'push-ups',
    });
    expect(duelConfig(duelProgress(DUEL, allOf(1), true).rounds[0] ?? (undefined as never), [pushUps])).toBeNull();
  });

  // Two devices may both know a set: it counts once.
  it('adds the sets done of two sources', () => {
    expect(addDuelDone({ 'final-battle/1/2': [3, 0], 'final-battle/1/1': [1] }, { 'final-battle/1/2': [1, 3] })).toEqual({
      'final-battle/1/1': [1],
      'final-battle/1/2': [0, 1, 3],
    });
  });

  it('finds a round by its id', () => {
    expect(findRound(DUEL, 'final-battle/1/3')?.number).toBe(3);
    expect(findRound(DUEL, 'final-battle/1/6')).toBeNull();
  });
});
