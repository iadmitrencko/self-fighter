import { describe, expect, it } from 'vitest';
import { campaignAttempt, fightAttempt, fightGame, legacyLadderAttempt, legacyTargetAttempt } from '../testing/fixtures';
import { addGameRecords, computeGameRecord, EMPTY_RECORD, totalTally, type GameRecord } from './record';

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
    });
    expect(totalTally(record)).toEqual({ wins: 4, draws: 1, losses: 3 });
  });

  // An attempt waits in the browser while the server knows the rest: together they count once.
  it('adds two records without counting a level twice', () => {
    const a: GameRecord = {
      fights: { wins: 1, draws: 0, losses: 2 },
      campaign: { wins: 1, draws: 0, losses: 0 },
      passed: ['forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: null },
    };
    const b: GameRecord = {
      fights: { wins: 0, draws: 1, losses: 0 },
      campaign: { wins: 2, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T12:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
    };

    expect(addGameRecords(a, b)).toEqual({
      fights: { wins: 1, draws: 1, losses: 2 },
      campaign: { wins: 3, draws: 0, losses: 1 },
      passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
      energy: { fight: '2026-10-30T16:00:00.000Z', campaign: '2026-10-30T15:00:00.000Z' },
    });
  });
});
