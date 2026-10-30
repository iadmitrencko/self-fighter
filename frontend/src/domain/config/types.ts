import type { ExerciseRef } from '../catalog/exercise';

export type Mode = 'target' | 'random-opponent' | 'opponent-levels' | 'ladder';
export type FightMode = Exclude<Mode, 'ladder'>;

// over: the result must exceed the target; meet: reaching it is enough (§4.4).
export type WinRule = 'over' | 'meet';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface FightConfigBase<TMode extends FightMode, TExercise extends ExerciseRef> {
  readonly mode: TMode;
  readonly rule: WinRule;
  readonly rounds: number;
  readonly exercises: readonly TExercise[];
}

export interface TargetExercise extends ExerciseRef {
  readonly targets: readonly number[];
}

export interface RangeExercise extends ExerciseRef {
  readonly min: number;
  readonly max: number;
}

export interface LevelExercise extends ExerciseRef {
  readonly upperBound: number;
}

export type TargetConfig = FightConfigBase<'target', TargetExercise>;
export type RandomOpponentConfig = FightConfigBase<'random-opponent', RangeExercise>;

export interface OpponentLevelsConfig extends FightConfigBase<'opponent-levels', LevelExercise> {
  readonly difficulty: Difficulty;
}

export interface LadderConfig {
  readonly mode: 'ladder';
  readonly rule: WinRule;
  readonly exercise: ExerciseRef;
  readonly max: number;
  readonly returnDown: boolean;
}

export type FightConfig = TargetConfig | RandomOpponentConfig | OpponentLevelsConfig;
export type WorkoutConfig = FightConfig | LadderConfig;

// A form may hold empty fields: an empty value is not zero (§4.3).
type Draft<T> = T extends number
  ? number | null
  : T extends readonly (infer TItem)[]
    ? readonly Draft<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: Draft<T[TKey]> }
      : T;

export type TargetDraft = Draft<TargetConfig>;
export type RandomOpponentDraft = Draft<RandomOpponentConfig>;
export type OpponentLevelsDraft = Draft<Omit<OpponentLevelsConfig, 'difficulty'>> & {
  readonly difficulty: Difficulty | null;
};
export type LadderDraft = Draft<Omit<LadderConfig, 'exercise'>> & {
  readonly exercise: ExerciseRef | null;
};

export type WorkoutDraft =
  | TargetDraft
  | RandomOpponentDraft
  | OpponentLevelsDraft
  | LadderDraft
  | { readonly mode: null };
