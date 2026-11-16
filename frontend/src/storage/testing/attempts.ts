import { createSession } from '../../domain/engine/session';
import { finalize, type CampaignAttempt, type DuelAttempt, type FightAttempt } from '../../domain/history/attempt';
import { levelConfig, retreat } from '../../domain/kozak/battle';
import type { DuelDone } from '../../domain/kozak/duel';
import { findLevel, SICH } from '../../domain/kozak/journey';
import type { BattleOutcome } from '../../domain/results/results';
import { duelBattle, fightConfig, play, pullUps, testDeps } from '../../domain/testing/fixtures';
import { newId } from '../ids';

// §6: a fight of the game, every set done or left before its last one.
export function gameFight(outcome: BattleOutcome, finishedAt: string, energyFullAt: string, config = fightConfig()): FightAttempt {
  const session = createSession(config, testDeps({ newId: () => newId(Date.parse(finishedAt)) }));
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

// A fight that finished at this time, for a test that needs any attempt of the history.
export function finishedFight(outcome: BattleOutcome, finishedAt: string): FightAttempt {
  return gameFight(outcome, finishedAt, new Date(Date.parse(finishedAt) + 2 * 3_600_000).toISOString());
}
