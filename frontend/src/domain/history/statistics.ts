import type { Outcome } from '../results/results';
import type { Attempt } from './attempt';

export interface Statistics {
  readonly total: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}

// Always derived from the attempts, so it cannot drift away from the history (§14.2).
export function computeStatistics(attempts: readonly Attempt[]): Statistics {
  const count = (expected: Outcome) =>
    attempts.filter(({ result }) => result.outcome === expected).length;

  return {
    total: attempts.length,
    wins: count('win'),
    draws: count('draw'),
    losses: count('loss'),
  };
}
