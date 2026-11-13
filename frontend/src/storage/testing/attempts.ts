import type { ChallengeRef } from '../../domain/catalog/challenge';
import { createSession } from '../../domain/engine/session';
import { finalize, type Attempt, type CampaignAttempt, type DuelAttempt, type FightAttempt } from '../../domain/history/attempt';
import { levelConfig, retreat } from '../../domain/kozak/battle';
import type { DuelDone } from '../../domain/kozak/duel';
import { findLevel, SICH } from '../../domain/kozak/journey';
import type { BattleOutcome, Outcome } from '../../domain/results/results';
import {
  duelBattle,
  fightConfig,
  legacyLadderAttempt,
  legacyTargetAttempt,
  play,
  pullUps,
  testDeps,
} from '../../domain/testing/fixtures';
import { newId } from '../ids';

/**
 * A workout of the old site (§24.1): «Ціль» or a ladder as the server stored them, before a fight
 * was put together freely (§6). It may name a ready-made challenge of that time.
 */
export function finishedAttempt(
  outcome: Outcome,
  finishedAt: string,
  mode: 'target' | 'ladder' = 'target',
  challenge: ChallengeRef | null = null,
): Attempt {
  const options = { id: newId(Date.parse(finishedAt)), finishedAt: new Date(finishedAt), challenge };

  return mode === 'ladder' ? legacyLadderAttempt(outcome === 'win' ? 'win' : 'loss', options) : legacyTargetAttempt(outcome, options);
}

// §24: a fight of «Ціль» the game played before §6, with the energy of fights. It could end in a draw.
export function oldGameFight(outcome: Outcome, finishedAt: string, energyFullAt: string): Attempt {
  return { ...finishedAttempt(outcome, finishedAt), game: { pool: 'fight', energyFullAt } };
}

// §6: a fight of the game, every set done or left before its last one.
export function gameFight(outcome: BattleOutcome, finishedAt: string, energyFullAt: string): FightAttempt {
  const session = createSession(fightConfig(), testDeps({ newId: () => newId(Date.parse(finishedAt)) }));
  const played = play(session, outcome === 'win' ? null : session.stages.length - 1);

  return { ...finalize(played, new Date(finishedAt)), game: { pool: 'fight', energyFullAt } };
}

// §24.5: a level of the journey, won or left before its first set.
export function levelAttempt(
  level: string,
  outcome: BattleOutcome,
  finishedAt: string,
  energyFullAt: string,
): CampaignAttempt {
  const definition = findLevel(SICH, level);

  if (definition === null) {
    throw new Error(`The journey has no level ${level}`);
  }
  const session = createSession(levelConfig(definition, pullUps), testDeps({ newId: () => newId(Date.parse(finishedAt)) }));
  const played = outcome === 'win' ? play(session) : retreat(session);

  return { ...finalize(played, new Date(finishedAt)), game: { pool: 'campaign', energyFullAt } };
}

// §24.9: a battle of the duel with the King, its id made of the time it finished, as the browser makes it.
export function duelAttempt(
  round: number,
  finishedAt: string,
  energyFullAt: string,
  options: { readonly done?: DuelDone; readonly retreatAt?: number | null } = {},
): DuelAttempt {
  return duelBattle(round, finishedAt, energyFullAt, { ...options, newId: () => newId(Date.parse(finishedAt)) });
}
