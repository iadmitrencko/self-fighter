import type { ExerciseRef } from '../catalog/exercise';
import { roundsOf } from '../config/grid';
import type { CampaignConfig, FightConfig } from '../config/types';
import type { EnergyPool } from '../kozak/energy';

// Version 4 puts a fight together from exercises and rounds (§6) instead of the modes of the site;
// version 3 marked the battles of the game, version 2 a ready-made challenge (section 3.7 of the plan).
export const SCHEMA_VERSION = 4 as const;

// A battle of the game: the pool of energy it took and when that pool is full again (§24.4).
export interface GameMark {
  readonly pool: EnergyPool;
  readonly energyFullAt: string;
}

// One set of a battle: its repetitions and, once its turn has passed, whether they were done.
export interface SetStage {
  readonly target: number;
  // null while the set waits, false once the player retreated before doing it.
  readonly done: boolean | null;
}

// A set of a fight: one exercise in one round.
export interface FightStage extends SetStage {
  readonly round: number;
  readonly exercise: ExerciseRef;
}

interface SessionBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
  // The site offers no ready-made challenges any more (§21.3), so a battle never takes one.
  readonly challenge: null;
  // The pool of energy the battle took, set as it starts (§24.4).
  readonly game: GameMark | null;
}

export interface FightSession extends SessionBase {
  readonly mode: 'fight';
  readonly config: FightConfig;
  readonly stages: readonly FightStage[];
}

// A level of the journey: a stage per set.
export interface CampaignSession extends SessionBase {
  readonly mode: 'campaign';
  readonly config: CampaignConfig;
  readonly stages: readonly SetStage[];
}

export type Session = FightSession | CampaignSession;

export function isFightSession(session: Session): session is FightSession {
  return session.mode === 'fight';
}

export function isCampaignSession(session: Session): session is CampaignSession {
  return session.mode === 'campaign';
}

export interface SessionDeps {
  readonly now: () => Date;
  readonly newId: () => string;
}

// A fight goes round by round: every exercise of the first round, then every one of the second (§6).
function fightStages(config: FightConfig): FightStage[] {
  return Array.from({ length: roundsOf(config) }, (_, round) =>
    config.exercises.flatMap(({ id, name, sets }) => {
      const target = sets[round];

      return target === undefined ? [] : [{ round, exercise: { id, name }, target, done: null }];
    }),
  ).flat();
}

function campaignStages({ sets }: CampaignConfig): SetStage[] {
  return sets.map((target) => ({ target, done: null }));
}

export function createSession(config: FightConfig, deps: SessionDeps): FightSession;
export function createSession(config: CampaignConfig, deps: SessionDeps): CampaignSession;
export function createSession(config: FightConfig | CampaignConfig, deps: SessionDeps): Session;
// Everything the battle depends on is fixed here, so a reload or a change of the catalog cannot change it.
export function createSession(source: FightConfig | CampaignConfig, { now, newId }: SessionDeps): Session {
  const config = JSON.parse(JSON.stringify(source)) as FightConfig | CampaignConfig;
  const base = {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    startedAt: now().toISOString(),
    challenge: null,
    game: null,
  };

  return config.mode === 'campaign'
    ? { ...base, mode: config.mode, config, stages: campaignStages(config) }
    : { ...base, mode: config.mode, config, stages: fightStages(config) };
}

// The set to do now, or null once the battle is over: every set is done or the player retreated.
export function nextStageIndex(session: Session): number | null {
  if (session.stages.some(({ done }) => done === false)) {
    return null;
  }
  const next = session.stages.findIndex(({ done }) => done === null);

  return next === -1 ? null : next;
}

// Marks the set to do now. A battle that is over stays as it was, so a second tap records nothing.
export function markSet<TSession extends Session>(session: TSession, done: boolean): TSession {
  const index = nextStageIndex(session);

  if (index === null) {
    return session;
  }

  return {
    ...session,
    stages: session.stages.map((stage, position) => (position === index ? { ...stage, done } : stage)),
  };
}
