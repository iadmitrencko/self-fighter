import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { campaignAttempt, fightAttempt, legacyLadderAttempt, legacyTargetAttempt } from '../testing/fixtures';
import type { Attempt } from './attempt';
import { computeStatistics } from './statistics';

describe('computeStatistics', () => {
  it('is empty without attempts', () => {
    expect(computeStatistics([])).toEqual({ total: 0, wins: 0, draws: 0, losses: 0 });
  });

  // §14.2: the draws come from the old modes of the site only.
  it('counts every outcome', () => {
    expect(
      computeStatistics([
        fightAttempt('win'),
        campaignAttempt('forest-ravens/1/1', 'win'),
        legacyTargetAttempt('draw'),
        fightAttempt('loss'),
      ]),
    ).toEqual({ total: 4, wins: 2, draws: 1, losses: 1 });
  });

  // §14.2: the total always equals wins, draws and losses together.
  it('matches the history for any set of attempts', () => {
    const attempts: readonly Attempt[] = [
      fightAttempt('win'),
      fightAttempt('loss'),
      campaignAttempt('forest-ravens/1/1', 'loss'),
      legacyTargetAttempt('win'),
      legacyTargetAttempt('draw'),
      legacyLadderAttempt('loss'),
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
