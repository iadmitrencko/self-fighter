import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { TargetConfig } from '../config/types';
import { createSession } from '../engine/session';
import {
  cycleOffsets,
  offsetsArbitrary,
  play,
  pushUps,
  squats,
  STARTED_AT,
  targetConfig,
  testDeps,
  workoutConfigArbitrary,
} from '../testing/fixtures';
import { finalize } from './attempt';
import { computeStatistics } from './statistics';

// One round: 15 repetitions beat the first target and lose to the second one.
const config: TargetConfig = targetConfig({
  rounds: 1,
  exercises: [
    { ...pushUps, targets: [10] },
    { ...squats, targets: [20] },
  ],
});

function attemptWith(reps: number) {
  return finalize(play(createSession(config, testDeps()), () => reps), STARTED_AT);
}

describe('computeStatistics', () => {
  it('is empty without attempts', () => {
    expect(computeStatistics([])).toEqual({ total: 0, wins: 0, draws: 0, losses: 0 });
  });

  it('counts every outcome', () => {
    const win = attemptWith(99);
    const draw = attemptWith(15);
    const loss = attemptWith(0);

    expect(computeStatistics([win, win, draw, loss])).toEqual({
      total: 4,
      wins: 2,
      draws: 1,
      losses: 1,
    });
  });

  // §14.2: the total always equals wins, draws and losses together.
  it('matches the history for any set of attempts', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(workoutConfigArbitrary, offsetsArbitrary), { maxLength: 8 }),
        (runs) => {
          const attempts = runs.map(([workout, offsets]) =>
            finalize(play(createSession(workout, testDeps()), cycleOffsets(offsets)), STARTED_AT),
          );
          const { total, wins, draws, losses } = computeStatistics(attempts);

          expect(total).toBe(attempts.length);
          expect(wins + draws + losses).toBe(total);
        },
      ),
    );
  });
});
