import { describe, expect, it } from 'vitest';
import { campaignAttempt, fightAttempt, ladderConfig, play, STARTED_AT, testDeps } from '../testing/fixtures';
import { createSession } from '../engine/session';
import { finalize } from '../history/attempt';
import { addGameRecords, computeGameRecord, EMPTY_RECORD, totalTally, type GameRecord } from './record';

const fight = (energyFullAt: string) => ({ pool: 'fight' as const, energyFullAt });

describe('the record of the game', () => {
  it('is empty before the first battle', () => {
    expect(computeGameRecord([])).toEqual(EMPTY_RECORD);
  });

  // §24.6: the workouts of the site stay out of the game.
  it('counts the battles of the game only', () => {
    const record = computeGameRecord([
      fightAttempt('win'),
      fightAttempt('win', fight('2026-10-30T12:00:00.000Z')),
      fightAttempt('draw', fight('2026-10-30T16:00:00.000Z')),
      fightAttempt('loss', fight('2026-10-30T14:00:00.000Z')),
      { ...finalize(play(createSession(ladderConfig(), testDeps()), () => 0), STARTED_AT), game: fight('2026-10-30T13:00:00.000Z') },
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
