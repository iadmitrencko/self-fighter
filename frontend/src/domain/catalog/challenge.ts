import type { WorkoutConfig } from '../config/types';

// The ready-made challenge an attempt took, so the site can mark it as passed (§21.3).
export interface ChallengeRef {
  readonly slug: string;
  readonly title: string;
}

// An exercise is known by its id: its name follows the catalog (§5.3).
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonical(item));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const exercise = 'id' in value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([field]) => !(exercise && field === 'name'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([field, item]) => [field, canonical(item)]),
  );
}

/**
 * A challenge counts as passed only with the settings of its page: a changed challenge is a
 * workout of its own (§21.3). The order of fields and the names of exercises do not matter.
 */
export function keepsChallenge(config: WorkoutConfig, challenge: WorkoutConfig): boolean {
  return JSON.stringify(canonical(config)) === JSON.stringify(canonical(challenge));
}
