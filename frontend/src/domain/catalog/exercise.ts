import { EXERCISE_DESCRIPTION_MAX, EXERCISE_NAME_MAX } from '../config/limits';

// The part of an exercise that attempts keep, so they survive catalog changes (§5.3).
export interface ExerciseRef {
  readonly id: string;
  readonly name: string;
}

export interface ExerciseDraft {
  readonly name: string;
  readonly description: string;
}

export type ExerciseErrorCode =
  | 'exercise-name-required'
  | 'exercise-name-too-long'
  | 'exercise-name-taken'
  | 'exercise-description-too-long';

export type ExerciseValidation =
  | { readonly ok: true; readonly exercise: ExerciseDraft }
  | { readonly ok: false; readonly errors: readonly ExerciseErrorCode[] };

export function exerciseNameKey(name: string): string {
  return name.trim().normalize('NFC').toLowerCase();
}

// Counts code points, the same way as a VARCHAR column in MySQL.
function textLength(text: string): number {
  return [...text].length;
}

export function validateExerciseDraft(
  draft: ExerciseDraft,
  catalog: readonly ExerciseRef[],
  editedId?: string,
): ExerciseValidation {
  const name = draft.name.trim().normalize('NFC');
  const description = draft.description.trim().normalize('NFC');
  const nameKey = exerciseNameKey(name);
  const errors: ExerciseErrorCode[] = [];

  if (name === '') {
    errors.push('exercise-name-required');
  }
  if (textLength(name) > EXERCISE_NAME_MAX) {
    errors.push('exercise-name-too-long');
  }
  if (catalog.some(({ id, name }) => id !== editedId && exerciseNameKey(name) === nameKey)) {
    errors.push('exercise-name-taken');
  }
  if (textLength(description) > EXERCISE_DESCRIPTION_MAX) {
    errors.push('exercise-description-too-long');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, exercise: { name, description } };
}
