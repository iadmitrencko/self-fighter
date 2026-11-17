import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { finalize, type FightAttempt } from '../history/attempt';
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
import { addGameRecords, computeGameRecord, EMPTY_RECORD, totalTally, weekDays, weekTotals, type GameRecord } from './record';

describe('the record of the game', () => {
  it('is empty before the first battle', () => {
    expect(computeGameRecord([], 'UTC')).toEqual(EMPTY_RECORD);
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
    ], 'UTC');

    expect(record).toEqual({
      fights: { wins: 1, draws: 0, losses: 1 },
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T14:00:00.000Z', campaign: '2026-10-31T01:00:00.000Z' },
      // §24.10: the sets done of both fights and of the levels.
      exercises: {
        'pull-ups': { best: 1, total: 10 },
        'push-ups': { best: 12, total: 64 },
        squats: { best: 20, total: 80 },
      },
      // §24.12: every battle finished on one day, and §24.10: they did all of it then.
      days: ['2026-10-30'],
      week: { '2026-10-30': { 'pull-ups': 10, 'push-ups': 64, squats: 80 } },
      duel: {},
      duelAt: null,
    });
    expect(totalTally(record)).toEqual({ wins: 4, draws: 0, losses: 2 });
  });

  // §24.9: the duel counts the sets done in their places.
  it('keeps the sets of the duel done', () => {
    const first = duelBattle(4, '2026-10-30T11:00:00.000Z', '2026-10-30T13:00:00.000Z', { retreatAt: 4 });
    const record = computeGameRecord([
      first,
      // The next battle goes on from the fifth set and leaves after one more.
      duelBattle(4, '2026-10-30T12:00:00.000Z', '2026-10-30T15:00:00.000Z', { done: { 'final-battle/1/4': [0, 1, 2, 3] }, retreatAt: 1 }),
    ], 'UTC');

    expect(record).toMatchObject({
      campaign: { wins: 0, draws: 0, losses: 2 },
      passed: [],
      duel: { 'final-battle/1/4': [0, 1, 2, 3, 4] },
      duelAt: '2026-10-30T12:00:00.000Z',
    });
    expect(addGameRecords(record, computeGameRecord([first], 'UTC')).duel).toEqual(record.duel);
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
      // A retreat before the first set does nothing.
      campaignAttempt('black-flag/2/1', 'loss', '2026-10-30T15:00:00.000Z', { exercise: pushUps }),
      // The first round of the duel: 15, 20 and 25 push-ups.
      duelBattle(1, '2026-10-30T12:00:00.000Z', '2026-10-30T13:00:00.000Z'),
    ], 'UTC');

    expect(record.exercises).toEqual({
      [crunches.id]: { best: 40, total: 70 },
      'push-ups': { best: 25, total: 98 },
      squats: { best: 15, total: 30 },
    });
  });

  // §24.12: a battle finished near midnight belongs to the day of the player.
  it('puts every battle on the day of the player', () => {
    const late = { ...fightAttempt('win'), finishedAt: '2026-10-30T22:30:00.000Z' };

    expect(computeGameRecord([late], 'UTC')).toMatchObject({
      days: ['2026-10-30'],
      week: { '2026-10-30': { 'push-ups': 32, squats: 50 } },
    });
    expect(computeGameRecord([late], 'Europe/Kyiv')).toMatchObject({
      days: ['2026-10-31'],
      week: { '2026-10-31': { 'push-ups': 32, squats: 50 } },
    });
    // A battle left before its first set is a day with a battle, though without repetitions.
    expect(computeGameRecord([campaignAttempt('black-flag/2/1', 'loss', undefined, { exercise: pushUps })], 'UTC')).toMatchObject({
      days: ['2026-10-30'],
      week: {},
    });
  });

  // §24.10: the repetitions of the last seven days, a day without a battle among them.
  it('adds up the last seven days', () => {
    const record: GameRecord = {
      ...EMPTY_RECORD,
      week: {
        '2026-10-29': { 'push-ups': 100 },
        '2026-10-30': { 'push-ups': 10, squats: 20 },
        '2026-11-02': { squats: 5 },
        '2026-11-05': { 'pull-ups': 3, 'push-ups': 1 },
        // A battle a clock ahead of time put on tomorrow.
        '2026-11-06': { 'push-ups': 7 },
      },
    };

    expect(weekDays(record, '2026-11-05')).toEqual([
      { date: '2026-10-30', reps: 30 },
      { date: '2026-10-31', reps: 0 },
      { date: '2026-11-01', reps: 0 },
      { date: '2026-11-02', reps: 5 },
      { date: '2026-11-03', reps: 0 },
      { date: '2026-11-04', reps: 0 },
      { date: '2026-11-05', reps: 4 },
    ]);
    expect(weekTotals(record, '2026-11-05')).toEqual({ 'pull-ups': 3, 'push-ups': 11, squats: 25 });
  });

  // An attempt waits in the browser while the server knows the rest: together they count once.
  it('adds two records without counting a level twice', () => {
    const a: GameRecord = {
      fights: { wins: 1, draws: 0, losses: 2 },
      campaign: { wins: 1, draws: 0, losses: 0 },
      passed: ['forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: null },
      exercises: { 'push-ups': { best: 9, total: 30 }, 'pull-ups': { best: 2, total: 4 } },
      days: ['2026-10-29', '2026-10-30'],
      week: { '2026-10-29': { 'pull-ups': 4 }, '2026-10-30': { 'push-ups': 30 } },
      duel: { 'final-battle/1/2': [0, 1] },
      duelAt: '2026-10-30T13:00:00.000Z',
    };
    const b: GameRecord = {
      fights: { wins: 0, draws: 1, losses: 0 },
      campaign: { wins: 2, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T12:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      exercises: { 'pull-ups': { best: 3, total: 6 }, squats: { best: 15, total: 45 } },
      days: ['2026-10-30', '2026-10-31'],
      week: { '2026-10-30': { 'pull-ups': 6 }, '2026-10-31': { squats: 45 } },
      // The same sets of the duel done on another device count once.
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    };

    expect(addGameRecords(a, b)).toEqual({
      fights: { wins: 1, draws: 1, losses: 2 },
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      exercises: {
        'pull-ups': { best: 3, total: 10 },
        'push-ups': { best: 9, total: 30 },
        squats: { best: 15, total: 45 },
      },
      days: ['2026-10-29', '2026-10-30', '2026-10-31'],
      week: {
        '2026-10-29': { 'pull-ups': 4 },
        '2026-10-30': { 'pull-ups': 6, 'push-ups': 30 },
        '2026-10-31': { squats: 45 },
      },
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [0, 1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    });
  });
});
