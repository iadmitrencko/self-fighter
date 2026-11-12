import type { ExerciseRef } from '../catalog/exercise';
import type { Outcome } from '../results/results';
import type { AttemptBase } from './attempt';

/**
 * The modes of the site before version 1.8 of the specification: a goal, a random opponent, the
 * levels of opponents and the ladder. The game starts them no more, a fight is put together
 * freely (§6), but the history keeps their attempts and still reads them.
 */
export type LegacyMode = 'target' | 'random-opponent' | 'opponent-levels' | 'ladder';
export type RoundsMode = Exclude<LegacyMode, 'ladder'>;

// over: the result had to exceed the target; meet: reaching it was enough.
export type WinRule = 'over' | 'meet';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface RoundsConfigBase<TMode extends RoundsMode, TExercise extends ExerciseRef> {
  readonly mode: TMode;
  readonly rule: WinRule;
  readonly rounds: number;
  readonly exercises: readonly TExercise[];
}

export type TargetConfig = RoundsConfigBase<'target', ExerciseRef & { readonly targets: readonly number[] }>;
export type RandomOpponentConfig = RoundsConfigBase<
  'random-opponent',
  ExerciseRef & { readonly min: number; readonly max: number }
>;

export interface OpponentLevelsConfig
  extends RoundsConfigBase<'opponent-levels', ExerciseRef & { readonly upperBound: number }> {
  readonly difficulty: Difficulty;
}

export type RoundsConfig = TargetConfig | RandomOpponentConfig | OpponentLevelsConfig;

export interface LadderConfig {
  readonly mode: 'ladder';
  readonly rule: WinRule;
  readonly exercise: ExerciseRef;
  readonly max: number;
  readonly returnDown: boolean;
}

export interface ExerciseResult {
  readonly exercise: ExerciseRef;
  readonly target: number;
  readonly actual: number;
  readonly outcome: Exclude<Outcome, 'draw'>;
}

export interface RoundResult {
  readonly exercises: readonly ExerciseResult[];
  readonly won: number;
  readonly lost: number;
  readonly outcome: Outcome;
}

// The rounds won, drawn and lost against the goal or the opponent.
export interface RoundsResult {
  readonly rounds: readonly RoundResult[];
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly outcome: Outcome;
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
  readonly outcome: Exclude<Outcome, 'draw'>;
}

export interface RoundsAttempt extends AttemptBase {
  readonly mode: RoundsMode;
  readonly config: RoundsConfig;
  readonly result: RoundsResult;
}

export interface LadderAttempt extends AttemptBase {
  readonly mode: 'ladder';
  readonly config: LadderConfig;
  readonly result: LadderResult;
}

export type LegacyAttempt = RoundsAttempt | LadderAttempt;

export function isLegacyMode(mode: string): mode is LegacyMode {
  return mode === 'target' || mode === 'random-opponent' || mode === 'opponent-levels' || mode === 'ladder';
}
