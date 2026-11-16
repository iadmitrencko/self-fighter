import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { finalize, type Attempt, type FightAttempt } from '../history/attempt';
import {
  campaignAttempt,
  duelBattle,
  fightAttempt,
  fightConfig,
  fightGame,
  play,
  pushUps,
  testDeps,
} from '../testing/fixtures';
import { SICH } from './journey';
import { addGameRecords, bestSets, computeGameRecord, EMPTY_RECORD, totalTally, type GameRecord } from './record';

// A battle that finished at its own time, so the order of the attempts shows.
function at<T extends Attempt>(attempt: T, id: string, finishedAt: string): T {
  return { ...attempt, id, finishedAt };
}

describe('the record of the game', () => {
  it('is empty before the first battle', () => {
    expect(computeGameRecord([])).toEqual(EMPTY_RECORD);
  });

  // §24.6: the fights and the levels of the journey; a battle that never started counts for nothing.
  it('counts the battles of the game', () => {
    const record = computeGameRecord([
      { ...fightAttempt('win'), game: null },
      fightAttempt('win', fightGame('2026-10-30T12:00:00.000Z')),
      fightAttempt('loss', fightGame('2026-10-30T14:00:00.000Z')),
      campaignAttempt('forest-ravens/1/1', 'win', '2026-10-30T15:00:00.000Z'),
      campaignAttempt('forest-ravens/1/2', 'loss', '2026-10-30T20:00:00.000Z'),
      campaignAttempt('forest-ravens/1/2', 'win', '2026-10-31T01:00:00.000Z'),
      campaignAttempt('forest-ravens/1/1', 'win', '2026-10-30T18:00:00.000Z'),
    ]);

    expect(record).toEqual({
      fights: { wins: 1, draws: 0, losses: 1 },
      // The attempts finished together and count in the order they came: the lost fight is the latest.
      fightStreak: 0,
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T14:00:00.000Z', campaign: '2026-10-31T01:00:00.000Z' },
      best: { 'pull-ups': 1 },
      // §24.10: the sets done of both fights and of the levels.
      exercises: {
        'pull-ups': { best: 1, total: 10 },
        'push-ups': { best: 12, total: 64 },
        squats: { best: 20, total: 80 },
      },
      duel: {},
      duelAt: null,
    });
    expect(totalTally(record)).toEqual({ wins: 4, draws: 0, losses: 2 });
  });

  // §24.8: the best set of an exercise is the largest one done in a level, won or not.
  it('keeps the most repetitions done in one set of every exercise', () => {
    const record = computeGameRecord([
      campaignAttempt('forest-ravens/2/3', 'win'),
      // 1-2-3-2-1: the retreat at the fourth set leaves the top of the ladder done.
      campaignAttempt('black-flag/1/6', 'loss', '2026-10-30T15:00:00.000Z', { exercise: pushUps, retreatAt: 3 }),
      // A retreat before the first set does nothing.
      campaignAttempt('black-flag/2/1', 'loss', '2026-10-30T15:00:00.000Z', { exercise: pushUps }),
      campaignAttempt('forest-ravens/1/1', 'win'),
      // The fights of the game are put together freely and stay out of the records.
      fightAttempt('win', fightGame('2026-10-30T12:00:00.000Z')),
    ]);

    expect(record.best).toEqual({ 'pull-ups': 3, 'push-ups': 3 });
    expect(bestSets(SICH, record)).toEqual([
      { campaign: 'black-flag', exercise: 'push-ups', reps: 3 },
      { campaign: 'steppe-wolves', exercise: 'squats', reps: null },
      { campaign: 'forest-ravens', exercise: 'pull-ups', reps: 3 },
    ]);
    expect(bestSets(SICH, EMPTY_RECORD).map(({ reps }) => reps)).toEqual([null, null, null]);
  });

  // §24.9: the duel counts the sets done in their places, and its sets count for the records too.
  it('keeps the sets of the duel done', () => {
    const first = duelBattle(4, '2026-10-30T11:00:00.000Z', '2026-10-30T13:00:00.000Z', { retreatAt: 4 });
    const record = computeGameRecord([
      first,
      // The next battle goes on from the fifth set and leaves after one more.
      duelBattle(4, '2026-10-30T12:00:00.000Z', '2026-10-30T15:00:00.000Z', { done: { 'final-battle/1/4': [0, 1, 2, 3] }, retreatAt: 1 }),
    ]);

    expect(record).toMatchObject({
      campaign: { wins: 0, draws: 0, losses: 2 },
      passed: [],
      duel: { 'final-battle/1/4': [0, 1, 2, 3, 4] },
      duelAt: '2026-10-30T12:00:00.000Z',
      best: { 'pull-ups': 5, 'push-ups': 20, squats: 30 },
    });
    expect(addGameRecords(record, computeGameRecord([first])).duel).toEqual(record.duel);
  });

  // §24.10: every set done adds up, whatever the battle: a fight, a level or the duel.
  it('adds up the repetitions of every exercise', () => {
    const crunches = { id: '0195f2a4-6b1e-7c3d-8e9f-0a1b2c3d4e5f', name: 'Скручування' };
    const custom: FightAttempt = {
      ...finalize(play(createSession(fightConfig({ exercises: [{ ...crunches, sets: [30, 40] }] }), testDeps())), new Date('2026-10-30T11:00:00.000Z')),
      game: fightGame(),
    };
    const record = computeGameRecord([
      // Push-ups 10, 12 and 10; squats 15 and 15, the last set of 20 left undone.
      fightAttempt('loss'),
      custom,
      // 1-2-3-2-1 push-ups left at the fourth set.
      campaignAttempt('black-flag/1/6', 'loss', '2026-10-30T15:00:00.000Z', { exercise: pushUps, retreatAt: 3 }),
      // The first round of the duel: 15, 20 and 25 push-ups.
      duelBattle(1, '2026-10-30T12:00:00.000Z', '2026-10-30T13:00:00.000Z'),
    ]);

    expect(record.exercises).toEqual({
      [crunches.id]: { best: 40, total: 70 },
      'push-ups': { best: 25, total: 98 },
      squats: { best: 15, total: 30 },
    });
    // The records of the journey keep to its levels and the duel (§24.8).
    expect(record.best).toEqual({ 'push-ups': 25 });
  });

  // §24.7: the fights won since the last one that was not, by the time they finished.
  it('counts the fights won in a row', () => {
    const fights = [
      at(fightAttempt('win'), 'fight-1', '2026-10-30T10:10:00.000Z'),
      at(fightAttempt('loss'), 'fight-2', '2026-10-30T10:20:00.000Z'),
      at(fightAttempt('win'), 'fight-3', '2026-10-30T10:30:00.000Z'),
      // A level lost in between keeps out of the fights.
      at(campaignAttempt('forest-ravens/1/1', 'loss'), 'level-1', '2026-10-30T10:35:00.000Z'),
      at(fightAttempt('win'), 'fight-4', '2026-10-30T10:40:00.000Z'),
    ];

    expect(computeGameRecord(fights).fightStreak).toBe(2);
    // The order the attempts come in does not matter.
    expect(computeGameRecord(fights.toReversed()).fightStreak).toBe(2);
    expect(computeGameRecord(fights.slice(0, 2)).fightStreak).toBe(0);
    expect(computeGameRecord([...fights, at(fightAttempt('loss'), 'fight-5', '2026-10-30T10:50:00.000Z')]).fightStreak).toBe(0);
  });

  // An attempt waits in the browser while the server knows the rest: together they count once.
  it('adds two records without counting a level twice', () => {
    const a: GameRecord = {
      fights: { wins: 1, draws: 0, losses: 2 },
      fightStreak: 1,
      campaign: { wins: 1, draws: 0, losses: 0 },
      passed: ['forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: null },
      best: { 'push-ups': 9, 'pull-ups': 2 },
      exercises: { 'push-ups': { best: 9, total: 30 }, 'pull-ups': { best: 2, total: 4 } },
      duel: { 'final-battle/1/2': [0, 1] },
      duelAt: '2026-10-30T13:00:00.000Z',
    };
    const b: GameRecord = {
      fights: { wins: 0, draws: 1, losses: 0 },
      fightStreak: 0,
      campaign: { wins: 2, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T12:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      best: { 'pull-ups': 3 },
      exercises: { 'pull-ups': { best: 3, total: 6 }, squats: { best: 15, total: 45 } },
      // The same sets of the duel done on another device count once.
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    };

    expect(addGameRecords(a, b)).toEqual({
      fights: { wins: 1, draws: 1, losses: 2 },
      // The later record drew a fight, which ended the run of the earlier one.
      fightStreak: 0,
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      best: { 'pull-ups': 3, 'push-ups': 9 },
      exercises: {
        'pull-ups': { best: 3, total: 10 },
        'push-ups': { best: 9, total: 30 },
        squats: { best: 15, total: 45 },
      },
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [0, 1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    });
    // Fights won one after another in the later record go on with the run of the earlier one.
    expect(addGameRecords(a, { ...EMPTY_RECORD, fights: { wins: 2, draws: 0, losses: 0 }, fightStreak: 2 }).fightStreak).toBe(3);
    expect(addGameRecords(a, EMPTY_RECORD).fightStreak).toBe(1);
  });
});
