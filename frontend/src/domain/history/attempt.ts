import type { CampaignConfig, DuelConfig, FightConfig } from '../config/types';
import {
  nextStageIndex,
  SCHEMA_VERSION,
  type CampaignSession,
  type DuelSession,
  type FightSession,
  type GameMark,
  type Session,
} from '../engine/session';
import {
  computeCampaignResult,
  computeDuelResult,
  computeFightResult,
  type CampaignResult,
  type DuelResult,
  type FightResult,
} from '../results/results';

export interface AttemptBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  // The pool of energy the battle took (§24.4). A saved attempt always names it; only a battle that
  // never started, as a test may finish one, has none.
  readonly game: GameMark | null;
}

// §6: a fight of the game.
export interface FightAttempt extends AttemptBase {
  readonly mode: 'fight';
  readonly config: FightConfig;
  readonly result: FightResult;
}

// §24.5: a level of the journey.
export interface CampaignAttempt extends AttemptBase {
  readonly mode: 'campaign';
  readonly config: CampaignConfig;
  readonly result: CampaignResult;
}

// §24.9: a battle of the duel with the King of robbers.
export interface DuelAttempt extends AttemptBase {
  readonly mode: 'duel';
  readonly config: DuelConfig;
  readonly result: DuelResult;
}

// Every attempt is a battle of the game (§24.1).
export type Attempt = FightAttempt | CampaignAttempt | DuelAttempt;
export type AttemptMode = Attempt['mode'];

export function finalize(session: FightSession, finishedAt: Date): FightAttempt;
export function finalize(session: CampaignSession, finishedAt: Date): CampaignAttempt;
export function finalize(session: DuelSession, finishedAt: Date): DuelAttempt;
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
    // The device clock can move backwards during a battle.
    durationMs: Math.max(0, finishedAt.getTime() - Date.parse(session.startedAt)),
    game: session.game,
  };

  switch (session.mode) {
    case 'campaign':
      return { ...base, mode: session.mode, config: session.config, result: computeCampaignResult(session.stages) };
    case 'duel':
      return { ...base, mode: session.mode, config: session.config, result: computeDuelResult(session.stages) };
    case 'fight':
      return { ...base, mode: session.mode, config: session.config, result: computeFightResult(session.config, session.stages) };
  }
}
