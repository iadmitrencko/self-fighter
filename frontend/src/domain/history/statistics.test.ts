import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { campaignAttempt, duelBattle, fightAttempt } from '../testing/fixtures';
import type { Attempt } from './attempt';
import { computeStatistics } from './statistics';

describe('computeStatistics', () => {
  it('is empty without attempts', () => {
    expect(computeStatistics([])).toEqual({ total: 0, wins: 0, draws: 0, losses: 0 });
  });

  // §14.2: the battles of the game are won or lost so far; the draws wait for battles to come.
  it('counts every outcome', () => {
    expect(
      computeStatistics([
        fightAttempt('win'),
        campaignAttempt('forest-ravens/1/1', 'win'),
        duelBattle(1, '2026-10-30T12:00:00.000Z', '2026-10-30T14:00:00.000Z', { retreatAt: 0 }),
        fightAttempt('loss'),
      ]),
    ).toEqual({ total: 4, wins: 2, draws: 0, losses: 2 });
  });

  // §14.2: the total always equals wins, draws and losses together.
  it('matches the history for any set of attempts', () => {
    const attempts: readonly Attempt[] = [
      fightAttempt('win'),
      fightAttempt('loss'),
      campaignAttempt('forest-ravens/1/1', 'loss'),
      campaignAttempt('forest-ravens/1/1', 'win'),
      duelBattle(1, '2026-10-30T12:00:00.000Z', '2026-10-30T14:00:00.000Z'),
    ];

    fc.assert(
      fc.property(fc.array(fc.constantFrom(...attempts), { maxLength: 12 }), (picked) => {
        const { total, wins, draws, losses } = computeStatistics(picked);

        expect(total).toBe(picked.length);
        expect(wins + draws + losses).toBe(total);
      }),
    );
  });
});
