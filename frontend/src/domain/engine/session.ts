import type { ChallengeRef } from '../catalog/challenge';
import type { ExerciseRef } from '../catalog/exercise';
import type { CampaignConfig, FightConfig, FightMode, LadderConfig, WorkoutConfig } from '../config/types';
import { isValidReps } from '../config/validation';
import type { EnergyPool } from '../kozak/energy';
import { ladderSequence } from './ladder';
import { randomInt, rollLevelOpponent, type Rng } from './opponents';
import { ladderStageRule, stagePassed, type FightStage, type Stage } from './rules';

// Version 2 remembers the ready-made challenge of the attempt, version 3 the battle of the game
// and the levels of the journey (section 3.7 of the plan, §24).
export const SCHEMA_VERSION = 3 as const;

// A battle of the game: the pool of energy it took and when that pool is full again (§24.4).
export interface GameMark {
  readonly pool: EnergyPool;
  readonly energyFullAt: string;
}

interface SessionBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
  // null for a workout of the player's own settings.
  readonly challenge: ChallengeRef | null;
  // null for a workout of the site.
  readonly game: GameMark | null;
}

export interface FightSession extends SessionBase {
  readonly mode: FightMode;
  readonly config: FightConfig;
  readonly stages: readonly FightStage[];
}

export interface LadderSession extends SessionBase {
  readonly mode: 'ladder';
  readonly config: LadderConfig;
  readonly stages: readonly Stage[];
}

// A level of the journey: a stage per set, done or not.
export interface CampaignSession extends SessionBase {
  readonly mode: 'campaign';
  readonly config: CampaignConfig;
  readonly stages: readonly Stage[];
}

export type Session = FightSession | LadderSession | CampaignSession;
export type WorkoutSession = FightSession | LadderSession;

export function isCampaignSession(session: Session): session is CampaignSession {
  return session.mode === 'campaign';
}

export function isWorkoutSession(session: Session): session is WorkoutSession {
  return session.mode !== 'campaign';
}

export interface SessionDeps {
  readonly rng: Rng;
  readonly now: () => Date;
  readonly newId: () => string;
}

interface ExerciseTargets {
  readonly exercise: ExerciseRef;
  readonly targets: readonly number[];
}

function exerciseTargets(config: FightConfig, rng: Rng): ExerciseTargets[] {
  const rollRounds = (roll: () => number) => Array.from({ length: config.rounds }, roll);

  switch (config.mode) {
    case 'target':
      return config.exercises.map(({ id, name, targets }) => ({
        exercise: { id, name },
        targets,
      }));
    case 'random-opponent':
      return config.exercises.map(({ id, name, min, max }) => ({
        exercise: { id, name },
        targets: rollRounds(() => randomInt(rng, { min, max })),
      }));
    case 'opponent-levels':
      return config.exercises.map(({ id, name, upperBound }) => ({
        exercise: { id, name },
        targets: rollRounds(() => rollLevelOpponent(rng, upperBound, config.difficulty)),
      }));
  }
}

function fightStages(config: FightConfig, rng: Rng): FightStage[] {
  return exerciseTargets(config, rng)
    .flatMap(({ exercise, targets }) =>
      targets.map((target, round) => ({
        round,
        exercise,
        target,
        rule: config.rule,
        actual: null,
      })),
    )
    .sort((a, b) => a.round - b.round);
}

function ladderStages({ max, returnDown, rule }: LadderConfig): Stage[] {
  return ladderSequence(max, returnDown).map((target) => ({
    target,
    rule: ladderStageRule(target, max, rule),
    actual: null,
  }));
}

// A set is done once all its repetitions are (§24.5).
function campaignStages({ sets }: CampaignConfig): Stage[] {
  return sets.map((target) => ({ target, rule: 'meet', actual: null }));
}

export function createSession(config: FightConfig, deps: SessionDeps, challenge?: ChallengeRef | null): FightSession;
export function createSession(config: LadderConfig, deps: SessionDeps, challenge?: ChallengeRef | null): LadderSession;
export function createSession(config: CampaignConfig, deps: SessionDeps): CampaignSession;
export function createSession(
  config: WorkoutConfig,
  deps: SessionDeps,
  challenge?: ChallengeRef | null,
): WorkoutSession;
// Everything the attempt depends on is fixed here, so a reload cannot change it (§7.3, §11.6).
export function createSession(
  source: WorkoutConfig | CampaignConfig,
  { rng, now, newId }: SessionDeps,
  challenge: ChallengeRef | null = null,
): Session {
  const config = JSON.parse(JSON.stringify(source)) as WorkoutConfig | CampaignConfig;
  const base = {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    startedAt: now().toISOString(),
    challenge: challenge === null ? null : { slug: challenge.slug, title: challenge.title },
    game: null,
  };

  switch (config.mode) {
    case 'ladder':
      return { ...base, mode: config.mode, config, stages: ladderStages(config) };
    case 'campaign':
      return { ...base, mode: config.mode, config, stages: campaignStages(config) };
    default:
      return { ...base, mode: config.mode, config, stages: fightStages(config, rng) };
  }
}

// Returns null when the attempt is over: a failed step of a ladder or a set of a level of the
// journey not done ends it early (§9.5, §24.5).
export function nextStageIndex(session: Session): number | null {
  const next = session.stages.findIndex((stage) => stage.actual === null);
  const failed = session.stages.some((stage) => stage.actual !== null && !stagePassed(stage));
  const endsOnFailure = session.mode === 'ladder' || session.mode === 'campaign';

  return next === -1 || (endsOnFailure && failed) ? null : next;
}

// A repeated call for a filled stage returns the same session, so a double tap records nothing.
export function submitResult<TSession extends Session>(
  session: TSession,
  stageIndex: number,
  reps: number,
): TSession {
  const stage = session.stages[stageIndex];

  if (stage === undefined) {
    throw new RangeError(`Stage ${stageIndex} does not exist`);
  }
  if (stage.actual !== null) {
    return session;
  }
  if (stageIndex !== nextStageIndex(session)) {
    throw new RangeError(`Stage ${stageIndex} is not the current one`);
  }
  if (!isValidReps(reps)) {
    throw new RangeError(`Invalid number of repetitions: ${reps}`);
  }

  return {
    ...session,
    stages: session.stages.map((item, index) =>
      index === stageIndex ? { ...item, actual: reps } : item,
    ),
  };
}
