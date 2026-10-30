import type { ExerciseRef } from '../catalog/exercise';
import type { FightConfig, FightMode, LadderConfig, WorkoutConfig } from '../config/types';
import { isValidReps } from '../config/validation';
import { ladderSequence } from './ladder';
import { randomInt, rollLevelOpponent, type Rng } from './opponents';
import { ladderStageRule, stagePassed, type FightStage, type Stage } from './rules';

export const SCHEMA_VERSION = 1 as const;

interface SessionBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly startedAt: string;
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

export type Session = FightSession | LadderSession;

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

export function createSession(config: FightConfig, deps: SessionDeps): FightSession;
export function createSession(config: LadderConfig, deps: SessionDeps): LadderSession;
export function createSession(config: WorkoutConfig, deps: SessionDeps): Session;
// Everything the attempt depends on is fixed here, so a reload cannot change it (§7.3, §11.6).
export function createSession(source: WorkoutConfig, { rng, now, newId }: SessionDeps): Session {
  const config = JSON.parse(JSON.stringify(source)) as WorkoutConfig;
  const base = {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    startedAt: now().toISOString(),
  };

  return config.mode === 'ladder'
    ? { ...base, mode: config.mode, config, stages: ladderStages(config) }
    : { ...base, mode: config.mode, config, stages: fightStages(config, rng) };
}

// Returns null when the attempt is over: a failed ladder stage ends it early (§9.5).
export function nextStageIndex(session: Session): number | null {
  const next = session.stages.findIndex((stage) => stage.actual === null);
  const failed = session.stages.some((stage) => stage.actual !== null && !stagePassed(stage));

  return next === -1 || (session.mode === 'ladder' && failed) ? null : next;
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
