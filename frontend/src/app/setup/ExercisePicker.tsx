import { useId } from 'react';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import { EXERCISES_MAX } from '../../domain/config/limits';
import { setupTexts } from '../../i18n/uk';
import { Icon } from '../components/Icon';

// §11.1: ready-made and custom exercises in one list. A fight takes up to 20, a ladder one.
export function ExercisePicker({
  ladder,
  selected,
  catalog,
  hasCustom,
  invalid,
  onPick,
  onRemove,
  onCreate,
  onManage,
}: {
  ladder: boolean;
  selected: readonly ExerciseRef[];
  catalog: readonly ExerciseRef[];
  hasCustom: boolean;
  invalid: boolean;
  onPick: (exercise: ExerciseRef) => void;
  onRemove: (id: string) => void;
  onCreate: () => void;
  onManage: () => void;
}) {
  const titleId = useId();
  const isSelected = ({ id }: ExerciseRef) => selected.some((exercise) => exercise.id === id);
  const catalogTools = (
    <>
      <li>
        <button type="button" className="chip chip--custom" onClick={onCreate}>
          <Icon name="plus" className="chip__icon" />
          {setupTexts.custom}
        </button>
      </li>
      {hasCustom && (
        <li>
          <button type="button" className="chip chip--plain" onClick={onManage}>
            {setupTexts.manage}
          </button>
        </li>
      )}
    </>
  );

  if (ladder) {
    return (
      <fieldset className="setup-section">
        <legend className="setup-section__title">{setupTexts.exercise}</legend>
        <ul className={invalid ? 'chips chips--invalid' : 'chips'} role="list">
          {catalog.map((exercise) => (
            <li key={exercise.id}>
              <label className="chip chip--option">
                <input
                  type="radio"
                  name="ladder-exercise"
                  className="chip__input"
                  checked={isSelected(exercise)}
                  onChange={() => onPick(exercise)}
                />
                {exercise.name}
              </label>
            </li>
          ))}
          {catalogTools}
        </ul>
      </fieldset>
    );
  }
  const full = selected.length >= EXERCISES_MAX;

  return (
    <section className="setup-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="setup-section__title">
        {setupTexts.exercises(selected.length)}
      </h2>
      <ul className={invalid ? 'chips chips--invalid' : 'chips'} role="list">
        {selected.map((exercise) => (
          <li key={exercise.id} className="chip chip--selected">
            {exercise.name}
            <button
              type="button"
              className="chip__remove"
              aria-label={setupTexts.remove(exercise.name)}
              onClick={() => onRemove(exercise.id)}
            >
              <Icon name="close" />
            </button>
          </li>
        ))}
        {catalog
          .filter((exercise) => !isSelected(exercise))
          .map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                className="chip chip--add"
                aria-label={setupTexts.add(exercise.name)}
                disabled={full}
                onClick={() => onPick(exercise)}
              >
                {exercise.name}
                <Icon name="plus" className="chip__icon" />
              </button>
            </li>
          ))}
        {catalogTools}
      </ul>
    </section>
  );
}
