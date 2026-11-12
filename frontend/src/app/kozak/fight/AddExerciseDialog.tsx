import { useState } from 'react';
import type { ExerciseRef } from '../../../domain/catalog/exercise';
import { fightHallTexts } from '../../../i18n/kozak';
import { exerciseFormTexts } from '../../../i18n/uk';
import type { CustomExercise } from '../../../storage/contract';
import { Dialog } from '../../components/Dialog';
import { KozakIcon } from '../parts';
import { ExerciseFormDialog, ManageExercisesDialog } from './ExerciseDialogs';

type Step =
  | { readonly kind: 'pick' }
  | { readonly kind: 'create' }
  | { readonly kind: 'manage' }
  | { readonly kind: 'edit'; readonly exercise: CustomExercise };

/**
 * §5, §6: a new row of the fight, an exercise of the catalog the fight does not have yet. A custom
 * exercise is made, renamed and deleted here as well, and a new one goes straight into the fight.
 */
export function AddExerciseDialog({
  catalog,
  custom,
  taken,
  onPick,
  onRenamed,
  onDeleted,
  onCustomChanged,
  onClose,
}: {
  catalog: readonly ExerciseRef[];
  custom: readonly CustomExercise[];
  // The exercises the fight already has.
  taken: readonly string[];
  onPick: (exercise: ExerciseRef) => void;
  onRenamed: (exercise: ExerciseRef) => void;
  onDeleted: (id: string) => void;
  onCustomChanged: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const free = catalog.filter(({ id }) => !taken.includes(id));

  if (step.kind === 'create' || step.kind === 'edit') {
    return (
      <ExerciseFormDialog
        editing={step.kind === 'edit' ? step.exercise : null}
        catalog={catalog}
        onSaved={(exercise) => {
          onCustomChanged();

          if (step.kind === 'edit') {
            onRenamed(exercise);
            setStep({ kind: 'manage' });
          } else {
            onPick(exercise);
          }
        }}
        onClose={() => setStep(step.kind === 'edit' ? { kind: 'manage' } : { kind: 'pick' })}
      />
    );
  }
  if (step.kind === 'manage') {
    return (
      <ManageExercisesDialog
        exercises={custom}
        onEdit={(exercise) => setStep({ kind: 'edit', exercise })}
        onDeleted={(id) => {
          onCustomChanged();
          onDeleted(id);
        }}
        onClose={() => setStep({ kind: 'pick' })}
      />
    );
  }

  return (
    <Dialog title={fightHallTexts.pickTitle} onClose={onClose}>
      {free.length === 0 ? (
        <p className="dialog__text">{fightHallTexts.pickNone}</p>
      ) : (
        <ul className="k-pick" role="list">
          {free.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" className="k-pick__option" onClick={() => onPick(exercise)}>
                <span>{exercise.name}</span>
                <KozakIcon name="plus" className="k-pick__icon" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="dialog__actions">
        <button type="button" className="button button--outline" onClick={() => setStep({ kind: 'create' })}>
          {fightHallTexts.custom}
        </button>
        {custom.length > 0 && (
          <button type="button" className="button button--outline" onClick={() => setStep({ kind: 'manage' })}>
            {fightHallTexts.manage}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={onClose}>
          {exerciseFormTexts.close}
        </button>
      </div>
    </Dialog>
  );
}
