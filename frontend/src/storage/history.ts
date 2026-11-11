import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import type { AttemptFilter, StoredAttempt } from './contract';

export const PAGE_SIZE = 20;

export const NO_STATISTICS: Statistics = { total: 0, wins: 0, draws: 0, losses: 0 };

// The same filters the server applies (§14.3). ISO strings in UTC sort as the times they hold.
export function matches(attempt: Attempt, filter: AttemptFilter): boolean {
  return (
    (filter.mode === undefined || attempt.mode === filter.mode) &&
    (filter.outcome === undefined || attempt.result.outcome === filter.outcome) &&
    (filter.from === undefined || attempt.finishedAt >= filter.from) &&
    (filter.to === undefined || attempt.finishedAt < filter.to)
  );
}

export function newestFirst(a: StoredAttempt, b: StoredAttempt): number {
  return (
    b.attempt.finishedAt.localeCompare(a.attempt.finishedAt) ||
    b.attempt.id.localeCompare(a.attempt.id)
  );
}

// What the server counted and what still waits in the browser.
export function addStatistics(a: Statistics, b: Statistics): Statistics {
  return {
    total: a.total + b.total,
    wins: a.wins + b.wins,
    draws: a.draws + b.draws,
    losses: a.losses + b.losses,
  };
}
