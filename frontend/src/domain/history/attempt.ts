import type { FightConfig, FightMode, LadderConfig } from '../config/types';
import {
  nextStageIndex,
  SCHEMA_VERSION,
  type FightSession,
  type LadderSession,
  type Session,
} from '../engine/session';
import {
  computeFightResult,
  computeLadderResult,
  type FightResult,
  type LadderResult,
} from '../results/results';

interface AttemptBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface FightAttempt extends AttemptBase {
  readonly mode: FightMode;
  readonly config: FightConfig;
  readonly result: FightResult;
}

export interface LadderAttempt extends AttemptBase {
  readonly mode: 'ladder';
  readonly config: LadderConfig;
  readonly result: LadderResult;
}

export type Attempt = FightAttempt | LadderAttempt;

export function finalize(session: FightSession, finishedAt: Date): FightAttempt;
export function finalize(session: LadderSession, finishedAt: Date): LadderAttempt;
export function finalize(session: Session, finishedAt: Date): Attempt;
// The attempt keeps the id of the session, so saving it twice cannot create a second record.
export function finalize(session: Session, finishedAt: Date): Attempt {
  if (nextStageIndex(session) !== null) {
    throw new Error(`Session ${session.id} is not finished`);
  }

  const base = {
    schemaVersion: SCHEMA_VERSION,
    id: session.id,
    startedAt: session.startedAt,
    finishedAt: finishedAt.toISOString(),
    // The device clock can move backwards during a workout.
    durationMs: Math.max(0, finishedAt.getTime() - Date.parse(session.startedAt)),
  };

  return session.mode === 'ladder'
    ? {
        ...base,
        mode: session.mode,
        config: session.config,
        result: computeLadderResult(session.stages),
      }
    : {
        ...base,
        mode: session.mode,
        config: session.config,
        result: computeFightResult(session.stages),
      };
}
