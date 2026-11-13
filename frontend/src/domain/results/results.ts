import type { ExerciseRef } from '../catalog/exercise';
import type { FightConfig } from '../config/types';
import type { DuelStage, FightStage, SetStage } from '../engine/session';

// A battle is won or lost. The attempts of the old modes of the site could also end in a draw,
// and the history still counts them (§14.2).
export type Outcome = 'win' | 'draw' | 'loss';
export type BattleOutcome = Exclude<Outcome, 'draw'>;

export interface SetResult {
  readonly target: number;
  readonly done: boolean;
}

// §6: the sets of one exercise of a fight, one for every round.
export interface FightExerciseResult {
  readonly exercise: ExerciseRef;
  readonly sets: readonly SetResult[];
}

// §6: a fight is won when every set is done.
export interface FightResult {
  readonly exercises: readonly FightExerciseResult[];
  readonly outcome: BattleOutcome;
}

// §24.5: a level of the journey is won when every set is done.
export interface CampaignResult {
  readonly sets: readonly SetResult[];
  readonly outcome: BattleOutcome;
}

// §24.9: a set of the duel with its exercise.
export interface DuelSetResult extends SetResult {
  readonly exercise: ExerciseRef;
}

// A battle of the duel is won when it does every set left in its round.
export interface DuelResult {
  readonly sets: readonly DuelSetResult[];
  readonly outcome: BattleOutcome;
}

function setResult({ target, done }: SetStage): SetResult {
  return { target, done: done === true };
}

function decide(sets: readonly SetResult[]): BattleOutcome {
  return sets.every(({ done }) => done) ? 'win' : 'loss';
}

export function computeFightResult(config: FightConfig, stages: readonly FightStage[]): FightResult {
  const exercises = config.exercises.map(({ id, name }) => ({
    exercise: { id, name },
    sets: stages.filter(({ exercise }) => exercise.id === id).map(setResult),
  }));

  return { exercises, outcome: decide(exercises.flatMap(({ sets }) => sets)) };
}

export function computeCampaignResult(stages: readonly SetStage[]): CampaignResult {
  const sets = stages.map(setResult);

  return { sets, outcome: decide(sets) };
}

export function computeDuelResult(stages: readonly DuelStage[]): DuelResult {
  const sets = stages.map((stage) => ({ exercise: stage.exercise, ...setResult(stage) }));

  return { sets, outcome: decide(sets) };
}
