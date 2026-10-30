import { describe, expect, it } from 'vitest';
import { EXERCISE_DESCRIPTION_MAX, EXERCISE_NAME_MAX } from '../config/limits';
import { pushUps, squats } from '../testing/fixtures';
import { exerciseNameKey, validateExerciseDraft, type ExerciseValidation } from './exercise';

const catalog = [pushUps, squats];

function errorsOf(validation: ExerciseValidation): readonly string[] {
  return validation.ok ? [] : validation.errors;
}

describe('validateExerciseDraft', () => {
  it('trims the fields of a valid exercise', () => {
    const validation = validateExerciseDraft({ name: '  Бурпі ', description: ' З вистрибом ' }, catalog);

    expect(validation).toEqual({
      ok: true,
      exercise: { name: 'Бурпі', description: 'З вистрибом' },
    });
  });

  it('allows an empty description', () => {
    expect(validateExerciseDraft({ name: 'Бурпі', description: '' }, catalog).ok).toBe(true);
  });

  // §5.2: a name must not be empty after trimming.
  it.each(['', '    ', '\t\n'])('rejects the blank name %j', (name) => {
    expect(errorsOf(validateExerciseDraft({ name, description: '' }, []))).toEqual([
      'exercise-name-required',
    ]);
  });

  // §5.2: up to 60 characters.
  it('accepts a name at the limit', () => {
    const name = 'я'.repeat(EXERCISE_NAME_MAX);

    expect(validateExerciseDraft({ name, description: '' }, catalog).ok).toBe(true);
  });

  it('rejects a name over the limit', () => {
    const name = 'я'.repeat(EXERCISE_NAME_MAX + 1);

    expect(errorsOf(validateExerciseDraft({ name, description: '' }, catalog))).toEqual([
      'exercise-name-too-long',
    ]);
  });

  // MySQL counts code points, so emoji must not use up the limit twice.
  it('counts characters, not UTF-16 units', () => {
    const name = '💪'.repeat(EXERCISE_NAME_MAX);

    expect(validateExerciseDraft({ name, description: '' }, catalog).ok).toBe(true);
  });

  // §5.2: up to 200 characters.
  it('checks the length of the description', () => {
    const atLimit = 'я'.repeat(EXERCISE_DESCRIPTION_MAX);
    const overLimit = `${atLimit}я`;

    expect(validateExerciseDraft({ name: 'Бурпі', description: atLimit }, catalog).ok).toBe(true);
    expect(errorsOf(validateExerciseDraft({ name: 'Бурпі', description: overLimit }, catalog))).toEqual(
      ['exercise-description-too-long'],
    );
  });

  // §5.2: names are unique without regard to case.
  it.each(['Віджимання', 'віджимання', 'ВІДЖИМАННЯ', ' вІдЖиМаННя '])(
    'rejects the taken name %j',
    (name) => {
      expect(errorsOf(validateExerciseDraft({ name, description: '' }, catalog))).toEqual([
        'exercise-name-taken',
      ]);
    },
  );

  // A name pasted from macOS can spell "й" as two code points.
  it('treats canonically equal names as the same name', () => {
    const decomposed = { id: 'custom', name: 'Підйом на носки'.normalize('NFD') };
    const validation = validateExerciseDraft({ name: 'підйом на носки', description: '' }, [
      decomposed,
    ]);

    expect(decomposed.name).not.toBe('Підйом на носки');
    expect(errorsOf(validation)).toEqual(['exercise-name-taken']);
  });

  it('stores the composed form of the text', () => {
    const validation = validateExerciseDraft(
      { name: 'Підйом'.normalize('NFD'), description: 'Підйом'.normalize('NFD') },
      [],
    );

    expect(validation).toEqual({
      ok: true,
      exercise: { name: 'Підйом', description: 'Підйом' },
    });
  });

  it('checks the length of the composed form', () => {
    const name = 'й'.normalize('NFD').repeat(EXERCISE_NAME_MAX);

    expect(validateExerciseDraft({ name, description: '' }, []).ok).toBe(true);
  });

  it('lets an edited exercise keep its own name', () => {
    const validation = validateExerciseDraft(
      { name: 'ВІДЖИМАННЯ', description: '' },
      catalog,
      pushUps.id,
    );

    expect(validation.ok).toBe(true);
  });

  it('does not let an edited exercise take another name', () => {
    const validation = validateExerciseDraft(
      { name: squats.name, description: '' },
      catalog,
      pushUps.id,
    );

    expect(errorsOf(validation)).toEqual(['exercise-name-taken']);
  });

  it('reports every problem at once', () => {
    const validation = validateExerciseDraft(
      { name: ' ', description: 'я'.repeat(EXERCISE_DESCRIPTION_MAX + 1) },
      [],
    );

    expect(errorsOf(validation)).toEqual([
      'exercise-name-required',
      'exercise-description-too-long',
    ]);
  });
});

describe('exerciseNameKey', () => {
  it('gives equal keys to names that count as the same', () => {
    expect(exerciseNameKey('  ПІДЙОМ ')).toBe(exerciseNameKey('підйом'.normalize('NFD')));
  });
});
