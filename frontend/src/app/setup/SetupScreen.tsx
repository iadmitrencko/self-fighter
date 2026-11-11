import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { keepsChallenge } from '../../domain/catalog/challenge';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import type { Mode, WorkoutConfig } from '../../domain/config/types';
import { validateConfig } from '../../domain/config/validation';
import { createSession } from '../../domain/engine/session';
import { commonTexts, setupTexts, validationMessages } from '../../i18n/uk';
import type { CustomExercise } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { useArena } from '../arena';
import { Screen, ScreenHead, type Back } from '../components/Screen';
import { Loading, MemoryWarning } from '../components/notices';
import { useGame, type Challenge } from '../game';
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

/**
 * §11: the setup of one mode. It starts from the last configuration of that mode, or from the
 * configuration of a ready-made challenge, which the player may change before the start (§21.3).
 */
export function SetupScreen({ mode, challenge }: { mode: Mode; challenge?: Challenge }) {
  const { storage } = useGame();
  const listCustom = useCallback(() => storage.exercises.list(), [storage]);
  const [custom, reloadCustom] = useLoad(listCustom);
  // Without the last configuration the form simply starts empty.
  const loadSaved = useCallback(
    () => (challenge === undefined ? storage.settings.get(mode).catch(() => null) : Promise.resolve(challenge.config)),
    [storage, mode, challenge],
  );
  const [saved] = useLoad(loadSaved);

  if (saved.status !== 'ready' || custom.status === 'loading') {
    return (
      <Screen title={setupTexts.title(mode)}>
        <SetupHead mode={mode} challenge={challenge} />
        <Loading />
      </Screen>
    );
  }

  return (
    <SetupForm
      mode={mode}
      challenge={challenge}
      saved={saved.value}
      custom={custom.status === 'ready' ? custom.value : []}
      customError={custom.status === 'failed' ? custom.error : null}
      onCustomChanged={reloadCustom}
    />
  );
}

// A challenge came from its page on the site, so «back» returns there.
function SetupHead({ mode, challenge }: { mode: Mode; challenge: Challenge | undefined }) {
  const arena = useArena();
  const back: Back =
    challenge === undefined
      ? arena.back.modes
      : { to: `/challenges/${challenge.slug}`, text: setupTexts.toChallenge, site: true };

  return (
    <ScreenHead
      back={back}
      eyebrow={challenge === undefined ? setupTexts.step(mode) : setupTexts.challengeStep(mode)}
      title={setupTexts.title(mode)}
    />
  );
}

type ExerciseDialog =
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly exercise: CustomExercise }
  | { readonly kind: 'manage' };

function SetupForm({
  mode,
  challenge,
  saved,
  custom,
  customError,
  onCustomChanged,
}: {
  mode: Mode;
  challenge: Challenge | undefined;
  saved: WorkoutConfig | null;
  custom: readonly CustomExercise[];
  customError: StorageErrorCode | null;
  onCustomChanged: () => void;
}) {
  const { storage, analytics, exercises: readyMade, deps } = useGame();
  const arena = useArena();
  const navigate = useNavigate();
  const catalog: readonly ExerciseRef[] = [...readyMade, ...custom];
  const [setup, setSetup] = useState(() => restoreSetup(mode, saved, catalog));
  const [attempts, setAttempts] = useState(0);
  const [refused, setRefused] = useState(false);
  const [dialog, setDialog] = useState<ExerciseDialog | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const validation = validateConfig(toDraft(setup));
  const errors = attempts > 0 && !validation.ok ? validation.errors : [];
  const ladder = mode === 'ladder';
  // Only the settings of the page pass the challenge (§21.3).
  const taken =
    challenge !== undefined && validation.ok && keepsChallenge(validation.config, challenge.config)
      ? { slug: challenge.slug, title: challenge.title }
      : null;

  // After a refused start the list of problems takes the focus, so it is read out at once.
  useEffect(() => {
    if (attempts > 0) {
      summary.current?.focus();
    }
  }, [attempts]);

  function start() {
    if (!validation.ok) {
      setAttempts((value) => value + 1);
      // §19: what keeps players from starting, one event for each kind of problem.
      for (const error of new Set(validation.errors.map(({ code }) => code))) {
        analytics.track({ name: 'setup_error', mode, error });
      }

      return;
    }
    // §11.6: the configuration is fixed here; later changes of the catalog cannot touch it.
    const session = arena.begin(createSession(validation.config, deps, taken));

    if (session === null) {
      setRefused(true);

      return;
    }
    arena.session.save(session);
    // The next workout of this mode starts from here. It is not worth stopping a workout for.
    // These settings make a new player a guest, so the event that follows them names the user (§19).
    void storage.settings
      .save(validation.config)
      .catch(() => undefined)
      .then(() => analytics.track({ name: 'workout_started', mode }));
    void navigate(arena.paths.fight);
  }

  return (
    <Screen title={setupTexts.title(mode)}>
      <SetupHead mode={mode} challenge={challenge} />
      <MemoryWarning />
      {challenge !== undefined && (
        <p className={`notice ${taken === null ? 'notice--warning' : 'notice--challenge'}`} aria-live="polite">
          <span className="notice__title">{challenge.title}</span>
          {taken === null ? setupTexts.challengeChanged : setupTexts.challengeFilled}
        </p>
      )}
      {/* On a desktop the common choices stand on the left, the values of the mode on the right. */}
      <form
        className="split split--setup"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <div className="split__column">
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
          {mode === 'opponent-levels' && (
            <DifficultyField
              value={setup.difficulty}
              onChange={(difficulty) => setSetup((current) => ({ ...current, difficulty }))}
            />
          )}
        </div>
        <div className="split__column">
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
            <UpperBounds
              setup={setup}
              errors={errors}
              onBound={(id, value) => setSetup((current) => setBound(current, id, value))}
            />
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
            {refused && arena.refusal}
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
