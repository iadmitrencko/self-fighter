import { describe, expect, it } from 'vitest';
import {
  campaignAttempt,
  duelBattle,
  fightAttempt,
  fightGame,
  legacyLadderAttempt,
  legacyTargetAttempt,
  pushUps,
} from '../testing/fixtures';
import { SICH } from './journey';
import { addGameRecords, bestSets, computeGameRecord, EMPTY_RECORD, totalTally, type GameRecord } from './record';

describe('the record of the game', () => {
  it('is empty before the first battle', () => {
    expect(computeGameRecord([])).toEqual(EMPTY_RECORD);
  });

  // §24.6: the workouts of the old site stay out of the game; its old fights count, a draw too.
  it('counts the battles of the game only', () => {
    const record = computeGameRecord([
      legacyTargetAttempt('win'),
      fightAttempt('win', fightGame('2026-10-30T12:00:00.000Z')),
      legacyTargetAttempt('draw', { game: fightGame('2026-10-30T16:00:00.000Z') }),
      fightAttempt('loss', fightGame('2026-10-30T14:00:00.000Z')),
      legacyLadderAttempt('loss', { game: fightGame('2026-10-30T13:00:00.000Z') }),
      campaignAttempt('forest-ravens/1/1', 'win', '2026-10-30T15:00:00.000Z'),
      campaignAttempt('forest-ravens/1/2', 'loss', '2026-10-30T20:00:00.000Z'),
      campaignAttempt('forest-ravens/1/2', 'win', '2026-10-31T01:00:00.000Z'),
      campaignAttempt('forest-ravens/1/1', 'win', '2026-10-30T18:00:00.000Z'),
    ]);

    expect(record).toEqual({
      fights: { wins: 1, draws: 1, losses: 2 },
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: '2026-10-31T01:00:00.000Z' },
      best: { 'pull-ups': 1 },
      duel: {},
      duelAt: null,
    });
    expect(totalTally(record)).toEqual({ wins: 4, draws: 1, losses: 3 });
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

  // An attempt waits in the browser while the server knows the rest: together they count once.
  it('adds two records without counting a level twice', () => {
    const a: GameRecord = {
      fights: { wins: 1, draws: 0, losses: 2 },
      campaign: { wins: 1, draws: 0, losses: 0 },
      passed: ['forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: null },
      best: { 'push-ups': 9, 'pull-ups': 2 },
      duel: { 'final-battle/1/2': [0, 1] },
      duelAt: '2026-10-30T13:00:00.000Z',
    };
    const b: GameRecord = {
      fights: { wins: 0, draws: 1, losses: 0 },
      campaign: { wins: 2, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T12:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      best: { 'pull-ups': 3 },
      // The same sets of the duel done on another device count once.
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    };

    expect(addGameRecords(a, b)).toEqual({
      fights: { wins: 1, draws: 1, losses: 2 },
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
      best: { 'pull-ups': 3, 'push-ups': 9 },
      duel: { 'final-battle/1/1': [0, 1, 2], 'final-battle/1/2': [0, 1, 2] },
      duelAt: '2026-10-30T14:00:00.000Z',
    });
  });
});
