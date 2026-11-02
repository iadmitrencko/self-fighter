import { useId, useState, type FormEvent } from 'react';
import { validateExerciseDraft, type ExerciseRef } from '../../domain/catalog/exercise';
import { commonTexts, exerciseFormTexts, storageMessages, validationMessages } from '../../i18n/uk';
import type { CustomExercise } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { Dialog } from '../components/Dialog';
import { useGame } from '../game';
import { errorCode } from '../useLoad';

// §5.2: a custom exercise has a name, unique in the whole catalog, and an optional description.
export function ExerciseFormDialog({
  editing,
  catalog,
  onSaved,
  onClose,
}: {
  editing: CustomExercise | null;
  catalog: readonly ExerciseRef[];
  onSaved: (exercise: CustomExercise) => void;
  onClose: () => void;
}) {
  const { storage, deps } = useGame();
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);
  const nameId = useId();
  const descriptionId = useId();
  const errorsId = useId();
  const validation = validateExerciseDraft({ name, description }, catalog, editing?.id);
  const errors = submitted && !validation.ok ? validation.errors : [];
  const nameInvalid = errors.some((code) => code !== 'exercise-description-too-long');
  const descriptionInvalid = errors.includes('exercise-description-too-long');

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);

    if (!validation.ok || saving) {
      return;
    }
    setSaving(true);
    setFailure(null);

    try {
      onSaved(await storage.exercises.save({ id: editing?.id ?? deps.newId(), ...validation.exercise }));
    } catch (error) {
      setFailure(errorCode(error));
      setSaving(false);
    }
  }

  return (
    <Dialog title={editing === null ? exerciseFormTexts.create : exerciseFormTexts.edit} onClose={onClose}>
      <form className="dialog__form" noValidate onSubmit={(event) => void save(event)}>
        <div className="field">
          <label className="field__label" htmlFor={nameId}>
            {exerciseFormTexts.name}
          </label>
          <input
            id={nameId}
            className="input"
            value={name}
            autoComplete="off"
            aria-invalid={nameInvalid || undefined}
            aria-describedby={errors.length > 0 ? errorsId : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="hint">{exerciseFormTexts.nameHint}</p>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={descriptionId}>
            {exerciseFormTexts.description}
          </label>
          <textarea
            id={descriptionId}
            className="input input--area"
            rows={3}
            value={description}
            aria-invalid={descriptionInvalid || undefined}
            aria-describedby={errors.length > 0 ? errorsId : undefined}
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="hint">{exerciseFormTexts.descriptionHint}</p>
        </div>
        {(errors.length > 0 || failure !== null) && (
          <div id={errorsId} className="field-errors" role="alert">
            {errors.map((code) => (
              <p key={code}>{validationMessages[code]}</p>
            ))}
            {failure !== null && <p>{storageMessages[failure]}</p>}
          </div>
        )}
        <div className="dialog__actions">
          <button type="button" className="button button--outline button--large" onClick={onClose}>
            {commonTexts.cancel}
          </button>
          <button type="submit" className="button button--primary button--large" disabled={saving}>
            {commonTexts.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// §5.2: renaming or deleting an exercise leaves saved attempts as they were (§5.3).
export function ManageExercisesDialog({
  exercises,
  onEdit,
  onDeleted,
  onClose,
}: {
  exercises: readonly CustomExercise[];
  onEdit: (exercise: CustomExercise) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const { storage } = useGame();
  const [deleting, setDeleting] = useState<CustomExercise | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);

  async function remove(exercise: CustomExercise) {
    setBusy(true);
    setFailure(null);

    try {
      await storage.exercises.remove(exercise.id);
      setDeleting(null);
      onDeleted(exercise.id);
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={exerciseFormTexts.manage} onClose={onClose}>
      {exercises.length === 0 ? (
        <p className="dialog__text">{exerciseFormTexts.empty}</p>
      ) : (
        <ul className="custom-list" role="list">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="custom-list__item">
              <div className="custom-list__text">
                <p className="custom-list__name">{exercise.name}</p>
                {exercise.description !== '' && (
                  <p className="custom-list__description">{exercise.description}</p>
                )}
              </div>
              {deleting?.id === exercise.id ? (
                <div className="custom-list__confirm">
                  <p>{exerciseFormTexts.deleteQuestion(exercise.name)}</p>
                  <div className="custom-list__actions">
                    <button type="button" className="button button--outline" onClick={() => setDeleting(null)}>
                      {commonTexts.cancel}
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={busy}
                      onClick={() => void remove(exercise)}
                    >
                      {exerciseFormTexts.delete}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="custom-list__actions">
                  <button
                    type="button"
                    className="button button--outline"
                    aria-label={exerciseFormTexts.changeLabel(exercise.name)}
                    onClick={() => onEdit(exercise)}
                  >
                    {exerciseFormTexts.change}
                  </button>
                  <button
                    type="button"
                    className="button button--outline"
                    aria-label={exerciseFormTexts.deleteLabel(exercise.name)}
                    onClick={() => setDeleting(exercise)}
                  >
                    {exerciseFormTexts.delete}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {failure !== null && (
        <p className="field-errors" role="alert">
          {storageMessages[failure]}
        </p>
      )}
      <div className="dialog__actions">
        <button type="button" className="button button--outline button--large" onClick={onClose}>
          {exerciseFormTexts.close}
        </button>
      </div>
    </Dialog>
  );
}
