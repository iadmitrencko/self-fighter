import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { nextStageIndex, submitResult, type WorkoutSession } from '../../domain/engine/session';
import { finalize } from '../../domain/history/attempt';
import { retreat } from '../../domain/kozak/battle';
import { commonTexts, fightTexts } from '../../i18n/uk';
import { useArena } from '../arena';
import { ConfirmDialog, Dialog } from '../components/Dialog';
import { useGame } from '../game';
import { FightScreen } from './FightScreen';
import { LadderScreen } from './LadderScreen';

/**
 * The attempt in progress. Every result goes to the browser at once, so a reload continues
 * where it stopped (§12.4); the last one turns the session into an attempt of the history.
 */
export function WorkoutScreen() {
  const { storage, analytics, deps } = useGame();
  const arena = useArena();
  const navigate = useNavigate();
  // finish() removes a finished session, so one left here is still in progress.
  const [session, setSession] = useState(() => {
    const loaded = arena.session.load();

    return loaded !== null && nextStageIndex(loaded) !== null ? loaded : null;
  });
  const [interrupting, setInterrupting] = useState(false);
  const [unsaved, setUnsaved] = useState<WorkoutSession | null>(null);
  const finishing = useRef(false);

  if (session === null) {
    return <Navigate to={arena.paths.modes} replace />;
  }

  // The attempt waits in the browser before the result shows, so nothing is lost offline (§15.4).
  const finish = (finished: WorkoutSession) => {
    const attempt = finalize(finished, deps.now());

    storage.attempts.save(attempt).then(
      () => {
        analytics.track({ name: 'workout_completed', mode: attempt.mode, outcome: attempt.result.outcome });
        arena.session.clear();
        // The result knows it follows the attempt, so it may tell what the attempt has just changed.
        void navigate(arena.paths.result(attempt.id), { replace: true, state: { fresh: true } });
      },
      () => {
        finishing.current = false;
        setUnsaved(finished);
      },
    );
  };

  // Returns false once the attempt is over. A second tap while it ends records nothing (§12.2).
  const submit = (reps: number): boolean => {
    const index = nextStageIndex(session);

    if (index === null || finishing.current) {
      return false;
    }
    const next = submitResult(session, index, reps);

    if (nextStageIndex(next) !== null) {
      arena.session.save(next);
      setSession(next);

      return true;
    }
    finishing.current = true;
    finish(next);

    return false;
  };

  const interrupt = () => {
    if (arena.leaving.kind === 'retreat') {
      setInterrupting(false);
      finishing.current = true;
      finish(retreat(session));

      return;
    }
    arena.session.clear();
    void navigate(arena.paths.modes, { replace: true });
  };

  return (
    <>
      {session.mode === 'ladder' ? (
        <LadderScreen session={session} onSubmit={submit} onInterrupt={() => setInterrupting(true)} />
      ) : (
        <FightScreen session={session} onSubmit={submit} onInterrupt={() => setInterrupting(true)} />
      )}
      {interrupting && (
        <ConfirmDialog
          title={arena.leaving.title}
          text={arena.leaving.text}
          cancel={arena.leaving.cancel}
          confirm={arena.leaving.confirm}
          onConfirm={interrupt}
          onCancel={() => setInterrupting(false)}
        />
      )}
      {unsaved !== null && (
        <Dialog title={fightTexts.saveFailedTitle} onClose={() => setUnsaved(null)}>
          <p className="dialog__text">{fightTexts.saveFailed}</p>
          <div className="dialog__actions">
            <button
              type="button"
              className="button button--primary button--large"
              onClick={() => {
                setUnsaved(null);
                finishing.current = true;
                finish(unsaved);
              }}
            >
              {commonTexts.retry}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
