import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { nextStageIndex, submitResult, type Session } from '../../domain/engine/session';
import { finalize } from '../../domain/history/attempt';
import { commonTexts, fightTexts } from '../../i18n/uk';
import { ConfirmDialog, Dialog } from '../components/Dialog';
import { useGame } from '../game';
import { paths } from '../paths';
import { FightScreen } from './FightScreen';
import { LadderScreen } from './LadderScreen';

/**
 * The attempt in progress. Every result goes to the browser at once, so a reload continues
 * where it stopped (§12.4); the last one turns the session into an attempt of the history.
 */
export function WorkoutScreen() {
  const { storage, analytics, deps } = useGame();
  const navigate = useNavigate();
  // finish() removes a finished session, so one left here is still in progress.
  const [session, setSession] = useState(() => {
    const loaded = storage.activeSession.load();

    return loaded !== null && nextStageIndex(loaded) !== null ? loaded : null;
  });
  const [interrupting, setInterrupting] = useState(false);
  const [unsaved, setUnsaved] = useState<Session | null>(null);
  const finishing = useRef(false);

  if (session === null) {
    return <Navigate to={paths.modes} replace />;
  }

  // The attempt waits in the browser before the result shows, so nothing is lost offline (§15.4).
  const finish = (finished: Session) => {
    const attempt = finalize(finished, deps.now());

    storage.attempts.save(attempt).then(
      () => {
        analytics.track({ name: 'workout_completed', mode: attempt.mode, outcome: attempt.result.outcome });
        storage.activeSession.clear();
        void navigate(paths.result(attempt.id), { replace: true });
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
      storage.activeSession.save(next);
      setSession(next);

      return true;
    }
    finishing.current = true;
    finish(next);

    return false;
  };

  const interrupt = () => {
    storage.activeSession.clear();
    void navigate(paths.modes, { replace: true });
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
          title={fightTexts.interruptTitle}
          text={fightTexts.interruptText}
          cancel={fightTexts.keepGoing}
          confirm={fightTexts.interrupt}
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
