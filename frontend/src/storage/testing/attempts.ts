import type { ChallengeRef } from '../../domain/catalog/challenge';
import { createSession } from '../../domain/engine/session';
import { finalize, type Attempt } from '../../domain/history/attempt';
import type { Outcome } from '../../domain/results/results';
import {
  ladderConfig,
  play,
  pushUps,
  squats,
  targetConfig,
  testDeps,
} from '../../domain/testing/fixtures';
import { newId } from '../ids';

// Reps for push-ups and squats against a target of 10: a draw wins one exercise and loses the other.
const TARGET_REPS: Record<Outcome, readonly number[]> = { win: [11, 11], draw: [11, 9], loss: [9, 9] };

// A finished attempt as the game stores it. A ladder knows only a win or a loss.
export function finishedAttempt(
  outcome: Outcome,
  finishedAt: string,
  mode: 'target' | 'ladder' = 'target',
  challenge: ChallengeRef | null = null,
): Attempt {
  const deps = testDeps({ newId: () => newId(Date.parse(finishedAt)) });

  if (mode === 'ladder') {
    const config = ladderConfig({ max: 1, returnDown: false, rule: 'meet' });

    return finalize(play(createSession(config, deps, challenge), () => (outcome === 'win' ? 1 : 0)), new Date(finishedAt));
  }
  const config = targetConfig({
    rounds: 1,
    exercises: [
      { ...pushUps, targets: [10] },
      { ...squats, targets: [10] },
    ],
  });
  const reps = [...TARGET_REPS[outcome]];

  return finalize(play(createSession(config, deps, challenge), () => reps.shift() ?? 0), new Date(finishedAt));
}
