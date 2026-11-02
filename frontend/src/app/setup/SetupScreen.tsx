import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import type { Mode, WorkoutConfig } from '../../domain/config/types';
import { validateConfig } from '../../domain/config/validation';
import { createSession } from '../../domain/engine/session';
import { commonTexts, setupTexts, validationMessages } from '../../i18n/uk';
import type { CustomExercise } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { Screen, ScreenHead } from '../components/Screen';
import { Loading, MemoryWarning } from '../components/notices';
import { useGame } from '../game';
import { paths } from '../paths';
import { useLoad } from '../useLoad';
import { ExerciseFormDialog, ManageExercisesDialog } from './ExerciseDialogs';
import { ExercisePicker } from './ExercisePicker';
import {
  DifficultyField,
  isInvalid,
  LadderFields,
  OpponentRanges,
  RoundsField,
  RuleField,
  TargetGrid,
  UpperBounds,
} from './ModeFields';
import {
  addExercise,
  fillTargets,
  removeExercise,
  renameExercise,
  restoreSetup,
  setBound,
  setRange,
  setRounds,
  setTarget,
  toDraft,
} from './setup';

// §11: the setup of one mode. It starts from the last configuration of that mode.
export function SetupScreen({ mode }: { mode: Mode }) {
  const { storage } = useGame();
  const listCustom = useCallback(() => storage.exercises.list(), [storage]);
  const [custom, reloadCustom] = useLoad(listCustom);
  // Without the last configuration the form simply starts empty.
  const loadSaved = useCallback(() => storage.settings.get(mode).catch(() => null), [storage, mode]);
  const [saved] = useLoad(loadSaved);

  if (saved.status !== 'ready' || custom.status === 'loading') {
    return (
      <Screen title={setupTexts.title(mode)}>
        <ScreenHead back={paths.modes} backLabel={setupTexts.back} eyebrow={setupTexts.step(mode)} title={setupTexts.title(mode)} />
        <Loading />
      </Screen>
    );
  }

  return (
    <SetupForm
      mode={mode}
      saved={saved.value}
      custom={custom.status === 'ready' ? custom.value : []}
      customError={custom.status === 'failed' ? custom.error : null}
      onCustomChanged={reloadCustom}
    />
  );
}

type ExerciseDialog =
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly exercise: CustomExercise }
  | { readonly kind: 'manage' };

function SetupForm({
  mode,
  saved,
  custom,
  customError,
  onCustomChanged,
}: {
  mode: Mode;
  saved: WorkoutConfig | null;
  custom: readonly CustomExercise[];
  customError: StorageErrorCode | null;
  onCustomChanged: () => void;
}) {
  const { storage, exercises: readyMade, deps } = useGame();
  const navigate = useNavigate();
  const catalog: readonly ExerciseRef[] = [...readyMade, ...custom];
  const [setup, setSetup] = useState(() => restoreSetup(mode, saved, catalog));
  const [attempts, setAttempts] = useState(0);
  const [dialog, setDialog] = useState<ExerciseDialog | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const validation = validateConfig(toDraft(setup));
  const errors = attempts > 0 && !validation.ok ? validation.errors : [];
  const ladder = mode === 'ladder';

  // After a refused start the list of problems takes the focus, so it is read out at once.
  useEffect(() => {
    if (attempts > 0) {
      summary.current?.focus();
    }
  }, [attempts]);

  function start() {
    if (!validation.ok) {
      setAttempts((value) => value + 1);

      return;
    }
    // §11.6: the configuration is fixed here; later changes of the catalog cannot touch it.
    storage.activeSession.save(createSession(validation.config, deps));
    // The next workout of this mode starts from here. It is not worth stopping a workout for.
    storage.settings.save(validation.config).catch(() => undefined);
    void navigate(paths.fight);
  }

  return (
    <Screen title={setupTexts.title(mode)} wide={mode === 'target'}>
      <ScreenHead back={paths.modes} backLabel={setupTexts.back} eyebrow={setupTexts.step(mode)} title={setupTexts.title(mode)} />
      <MemoryWarning />
      <form
        className="setup"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        {customError !== null && (
          <div className="notice notice--warning" role="status">
            <p>{setupTexts.exercisesFailed}</p>
            <button type="button" className="button button--outline" onClick={onCustomChanged}>
              {commonTexts.retry}
            </button>
          </div>
        )}
        <ExercisePicker
          ladder={ladder}
          selected={setup.exercises}
          catalog={catalog}
          hasCustom={custom.length > 0}
          invalid={isInvalid(errors, ['exercises-required', 'exercises-too-many', 'exercises-duplicate'])}
          onPick={(exercise) => setSetup((current) => addExercise(current, exercise))}
          onRemove={(id) => setSetup((current) => removeExercise(current, id))}
          onCreate={() => setDialog({ kind: 'create' })}
          onManage={() => setDialog({ kind: 'manage' })}
        />
        <RuleField value={setup.rule} onChange={(rule) => setSetup((current) => ({ ...current, rule }))} />
        {!ladder && (
          <RoundsField value={setup.rounds} onChange={(rounds) => setSetup((current) => setRounds(current, rounds))} />
        )}
        {mode === 'target' && (
          <TargetGrid
            setup={setup}
            errors={errors}
            onTarget={(id, round, value) => setSetup((current) => setTarget(current, id, round, value))}
            onFill={(id) => setSetup((current) => fillTargets(current, id))}
          />
        )}
        {mode === 'random-opponent' && (
          <OpponentRanges
            setup={setup}
            errors={errors}
            onRange={(id, bound, value) => setSetup((current) => setRange(current, id, bound, value))}
          />
        )}
        {mode === 'opponent-levels' && (
          <>
            <DifficultyField
              value={setup.difficulty}
              onChange={(difficulty) => setSetup((current) => ({ ...current, difficulty }))}
            />
            <UpperBounds
              setup={setup}
              errors={errors}
              onBound={(id, value) => setSetup((current) => setBound(current, id, value))}
            />
          </>
        )}
        {ladder && (
          <LadderFields
            setup={setup}
            errors={errors}
            onMax={(ladderMax) => setSetup((current) => ({ ...current, ladderMax }))}
            onReturnDown={(returnDown) => setSetup((current) => ({ ...current, returnDown }))}
          />
        )}
        <div className="screen__actions">
          {errors.length > 0 && (
            <div ref={summary} className="notice notice--error" role="alert" tabIndex={-1}>
              <p className="notice__title">{setupTexts.errors}</p>
              <ul className="notice__list">
                {[...new Set(errors.map(({ code }) => code))].map((code) => (
                  <li key={code}>{validationMessages[code]}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="submit" className="button button--primary button--large">
            {ladder ? setupTexts.startLadder : setupTexts.startFight}
          </button>
        </div>
      </form>
      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <ExerciseFormDialog
          editing={dialog.kind === 'edit' ? dialog.exercise : null}
          catalog={catalog}
          onSaved={(exercise) => {
            onCustomChanged();
            setSetup((current) =>
              dialog.kind === 'edit' ? renameExercise(current, exercise) : addExercise(current, exercise),
            );
            setDialog(dialog.kind === 'edit' ? { kind: 'manage' } : null);
          }}
          onClose={() => setDialog(dialog.kind === 'edit' ? { kind: 'manage' } : null)}
        />
      )}
      {dialog?.kind === 'manage' && (
        <ManageExercisesDialog
          exercises={custom}
          onEdit={(exercise) => setDialog({ kind: 'edit', exercise })}
          onDeleted={(id) => {
            onCustomChanged();
            setSetup((current) => removeExercise(current, id));
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </Screen>
  );
}
