import type { ExerciseRef } from '../catalog/exercise';
import type { CampaignConfig } from '../config/types';
import type { Stage } from '../engine/rules';
import { nextStageIndex, submitResult, type CampaignSession, type Session } from '../engine/session';
import { spendEnergy, type EnergyPool } from './energy';
import type { LevelDefinition } from './journey';

/**
 * §24.4: a battle of the game takes a unit of its pool when it starts, whatever its result.
 * The session keeps the new state of the pool, and the attempt carries it to the history.
 * Returns null when the pool is empty.
 */
export function enterBattle<TSession extends Session>(
  session: TSession,
  pool: EnergyPool,
  fullAt: string | null,
): TSession | null {
  const energyFullAt = spendEnergy(pool, fullAt, new Date(session.startedAt));

  return energyFullAt === null ? null : { ...session, game: { pool, energyFullAt } };
}

export function levelConfig(level: LevelDefinition, exercise: ExerciseRef): CampaignConfig {
  return {
    mode: 'campaign',
    level: level.id,
    exercise: { id: exercise.id, name: exercise.name },
    sets: [...level.sets],
  };
}

// §24.5: the player only says a set is done. The rest between sets takes as long as it needs.
export function completeSet(session: CampaignSession): CampaignSession {
  const index = nextStageIndex(session);

  return index === null ? session : submitResult(session, index, (session.stages[index] as Stage).target);
}

/**
 * §24.5, §24.6: leaving a battle of the game in the middle loses what is left of it, so its
 * energy stays spent. Every stage ahead gets no repetitions: a set of a level is not done, a step
 * of a ladder fails, a round of a fight goes to the opponent.
 */
export function retreat<TSession extends Session>(session: TSession): TSession {
  let current = session;

  for (let index = nextStageIndex(current); index !== null; index = nextStageIndex(current)) {
    current = submitResult(current, index, 0);
  }

  return current;
}
