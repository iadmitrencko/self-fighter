import type { ExerciseRef } from '../catalog/exercise';
import { stagePassed, type FightStage, type Stage } from '../engine/rules';

// These results are separate on purpose and must not be mixed (§4.5).
export type Outcome = 'win' | 'draw' | 'loss';
export type RoundOutcome = Outcome;
export type FightOutcome = Outcome;
export type ExerciseOutcome = Exclude<Outcome, 'draw'>;
export type LadderOutcome = Exclude<Outcome, 'draw'>;

export interface ExerciseResult {
  readonly exercise: ExerciseRef;
  readonly target: number;
  readonly actual: number;
  readonly outcome: ExerciseOutcome;
}

export interface RoundResult {
  readonly exercises: readonly ExerciseResult[];
  readonly won: number;
  readonly lost: number;
  readonly outcome: RoundOutcome;
}

export interface FightResult {
  readonly rounds: readonly RoundResult[];
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly outcome: FightOutcome;
}

export interface LadderStageResult {
  readonly target: number;
  readonly actual: number | null;
  readonly passed: boolean;
}

export interface LadderResult {
  readonly stages: readonly LadderStageResult[];
  readonly maxPassed: number;
  readonly passedCount: number;
  readonly outcome: LadderOutcome;
}

type FilledFightStage = FightStage & { readonly actual: number };

function decide(won: number, lost: number): Outcome {
  if (won > lost) {
    return 'win';
  }

  return won < lost ? 'loss' : 'draw';
}

function isFilled(stage: FightStage): stage is FilledFightStage {
  return stage.actual !== null;
}

function exerciseResult(stage: FilledFightStage): ExerciseResult {
  const { exercise, target, actual } = stage;

  return { exercise, target, actual, outcome: stagePassed(stage) ? 'win' : 'loss' };
}

function roundResult(stages: readonly FilledFightStage[]): RoundResult {
  const exercises = stages.map(exerciseResult);
  const won = exercises.filter(({ outcome }) => outcome === 'win').length;
  const lost = exercises.length - won;

  return { exercises, won, lost, outcome: decide(won, lost) };
}

// Counts finished rounds only, so it also gives the running score of a fight in progress.
export function computeFightResult(stages: readonly FightStage[]): FightResult {
  const roundNumbers = [...new Set(stages.map(({ round }) => round))];
  const rounds = roundNumbers
    .map((number) => stages.filter(({ round }) => round === number))
    .filter((round): round is FilledFightStage[] => round.every(isFilled))
    .map(roundResult);
  const count = (expected: RoundOutcome) =>
    rounds.filter(({ outcome }) => outcome === expected).length;
  const won = count('win');
  const lost = count('loss');

  return { rounds, won, drawn: count('draw'), lost, outcome: decide(won, lost) };
}

export function computeLadderResult(stages: readonly Stage[]): LadderResult {
  const passed = stages.filter(stagePassed);

  return {
    stages: stages.map((stage) => ({
      target: stage.target,
      actual: stage.actual,
      passed: stagePassed(stage),
    })),
    maxPassed: Math.max(0, ...passed.map(({ target }) => target)),
    passedCount: passed.length,
    outcome: passed.length === stages.length ? 'win' : 'loss',
  };
}
