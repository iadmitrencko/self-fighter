import type { ChallengeRef } from '../../domain/catalog/challenge';
import { createSession } from '../../domain/engine/session';
import { finalize, type Attempt, type CampaignAttempt } from '../../domain/history/attempt';
import { levelConfig, retreat } from '../../domain/kozak/battle';
import { findLevel, SICH } from '../../domain/kozak/journey';
import type { Outcome } from '../../domain/results/results';
import {
  ladderConfig,
  play,
  pullUps,
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

// §24: a fight of the game that took the energy of fights.
export function gameFight(outcome: Outcome, finishedAt: string, energyFullAt: string): Attempt {
  return { ...finishedAttempt(outcome, finishedAt), game: { pool: 'fight', energyFullAt } };
}

// §24.5: a level of the journey, won or left after its first set.
export function levelAttempt(
  level: string,
  outcome: 'win' | 'loss',
  finishedAt: string,
  energyFullAt: string,
): CampaignAttempt {
  const definition = findLevel(SICH, level);

  if (definition === null) {
    throw new Error(`The journey has no level ${level}`);
  }
  const session = createSession(levelConfig(definition, pullUps), testDeps({ newId: () => newId(Date.parse(finishedAt)) }));
  const played = outcome === 'win' ? play(session, (stage) => stage.target) : retreat(session);

  return { ...finalize(played, new Date(finishedAt)), game: { pool: 'campaign', energyFullAt } };
}
