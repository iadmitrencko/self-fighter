import type { Outcome } from '../results/results';
import type { Attempt } from './attempt';

export interface Statistics {
  readonly total: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  // The ready-made challenges won at least once, by slug in alphabetical order (§21.3).
  readonly challenges: readonly string[];
}

// A challenge is passed by a win with the settings of its page; trying it again changes nothing.
export function passedChallenges(attempts: readonly Attempt[]): string[] {
  const slugs = attempts.flatMap(({ challenge, result }) =>
    result.outcome === 'win' && challenge !== null ? [challenge.slug] : [],
  );

  return [...new Set(slugs)].sort();
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
    challenges: passedChallenges(attempts),
  };
}
