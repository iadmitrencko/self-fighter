import type { ChallengeRef } from '../catalog/challenge';
import type { CampaignConfig, FightConfig, FightMode, LadderConfig } from '../config/types';
import {
  nextStageIndex,
  SCHEMA_VERSION,
  type CampaignSession,
  type FightSession,
  type GameMark,
  type LadderSession,
  type Session,
  type WorkoutSession,
} from '../engine/session';
import {
  computeCampaignResult,
  computeFightResult,
  computeLadderResult,
  type CampaignResult,
  type FightResult,
  type LadderResult,
} from '../results/results';

interface AttemptBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly challenge: ChallengeRef | null;
  // null for a workout of the site (§24.4).
  readonly game: GameMark | null;
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

// A level of the journey (§24.5): the game always marks it.
export interface CampaignAttempt extends AttemptBase {
  readonly mode: 'campaign';
  readonly config: CampaignConfig;
  readonly result: CampaignResult;
}

export type WorkoutAttempt = FightAttempt | LadderAttempt;
export type Attempt = WorkoutAttempt | CampaignAttempt;

export function finalize(session: FightSession, finishedAt: Date): FightAttempt;
export function finalize(session: LadderSession, finishedAt: Date): LadderAttempt;
export function finalize(session: CampaignSession, finishedAt: Date): CampaignAttempt;
export function finalize(session: WorkoutSession, finishedAt: Date): WorkoutAttempt;
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
    challenge: session.challenge,
    game: session.game,
  };

  switch (session.mode) {
    case 'ladder':
      return { ...base, mode: session.mode, config: session.config, result: computeLadderResult(session.stages) };
    case 'campaign':
      return { ...base, mode: session.mode, config: session.config, result: computeCampaignResult(session.stages) };
    default:
      return { ...base, mode: session.mode, config: session.config, result: computeFightResult(session.stages) };
  }
}
