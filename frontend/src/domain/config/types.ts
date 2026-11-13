import type { ExerciseRef } from '../catalog/exercise';

/**
 * §6: a fight of the game is a grid the player puts together: the exercises in its rows, the
 * rounds in its columns and the repetitions of one set in every cell.
 */
export interface FightExercise extends ExerciseRef {
  // The repetitions of every round, in order. Every exercise of a fight has as many rounds.
  readonly sets: readonly number[];
}

export interface FightConfig {
  readonly mode: 'fight';
  readonly exercises: readonly FightExercise[];
}

// §24.5: a level of the journey, the sets of one exercise in their order. The journey sets it,
// and the player never edits it.
export interface CampaignConfig {
  readonly mode: 'campaign';
  // The level of the journey, such as forest-ravens/1/4.
  readonly level: string;
  readonly exercise: ExerciseRef;
  readonly sets: readonly number[];
}

// One set of a round of the duel: its exercise and its repetitions.
export interface DuelSet {
  readonly exercise: ExerciseRef;
  readonly reps: number;
}

// §24.9: a battle of the duel with the King of robbers, the final battle of the journey. It plays
// the sets of a round from the one the last battle stopped at, in the order of the round.
export interface DuelConfig {
  readonly mode: 'duel';
  // The round of the duel, such as final-battle/1/4.
  readonly round: string;
  // The place in the round of the first set of this battle.
  readonly from: number;
  readonly sets: readonly DuelSet[];
}
