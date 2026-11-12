import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { nextStageIndex, type Session } from '../../../domain/engine/session';
import { finalize, type BattleAttempt } from '../../../domain/history/attempt';
import { completeSet, retreat } from '../../../domain/kozak/battle';
import { battleTexts } from '../../../i18n/kozak';
import { commonTexts } from '../../../i18n/uk';
import type { ActiveSessionStore } from '../../../storage/contract';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { useGame } from '../../game';
import { KozakIcon } from '../parts';

// What the screen says about the set to do now: what it is above the line, whose repetitions below it.
export interface CurrentSet {
  readonly label: string;
  readonly value: ReactNode;
  readonly repsLabel: string;
}

export interface BattleView<TSession extends Session> {
  readonly title: (session: TSession) => string;
  readonly subtitle: (session: TSession) => string;
  readonly current: (session: TSession, index: number) => CurrentSet;
  // What the question before a retreat says the battle loses.
  readonly retreatText: string;
}

// A long fight shows its sets as one bar: segments would be too thin to tell apart.
const SEGMENTS_MAX = 30;

/**
 * Screen 6 of kozak_design for a level of the journey and a fight alike: one set after another,
 * as big as can be read from two meters. There is no timer: the player rests as long as needed and
 * says when a set is done (§6, §24.5). Leaving in the middle loses the battle.
 */
export function Battle<TSession extends Session>({
  store,
  exitTo,
  resultOf,
  view,
  onSaved,
}: {
  store: ActiveSessionStore<TSession>;
  // Where the screen leads without a battle in progress.
  exitTo: string;
  resultOf: (id: string) => string;
  view: BattleView<TSession>;
  onSaved?: (attempt: BattleAttempt) => void;
}) {
  const { storage, deps } = useGame();
  const navigate = useNavigate();
  const [session, setSession] = useState<TSession | null>(() => store.load());
  const [paused, setPaused] = useState(false);
  const [retreating, setRetreating] = useState(false);
  // A battle the browser could not keep, and whether the player stays to finish it or leaves it.
  const [unsaved, setUnsaved] = useState<{ session: TSession; leaving: boolean } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const finishing = useRef(false);

  useWakeLock();

  if (session === null) {
    return <Navigate to={exitTo} replace />;
  }

  // The attempt waits in the browser first, so a battle won without the network still counts (§15.4).
  const finish = (finished: TSession, leaving: boolean) => {
    const attempt = finalize(finished, deps.now());

    storage.attempts.save(attempt).then(
      () => {
        store.clear();
        onSaved?.(attempt);

        if (leaving) {
          void navigate(resultOf(attempt.id), { replace: true, state: { fresh: true } });
        } else {
          setSavedId(attempt.id);
        }
      },
      () => {
        finishing.current = false;
        setUnsaved({ session: finished, leaving });
      },
    );
  };

  const setDone = () => {
    if (finishing.current) {
      return;
    }
    const next = completeSet(session);

    setPaused(false);
    setSession(next);

    if (nextStageIndex(next) === null) {
      finishing.current = true;
      finish(next, false);
    } else {
      store.save(next);
    }
  };

  const leave = () => {
    setRetreating(false);

    if (!finishing.current) {
      finishing.current = true;
      finish(retreat(session), true);
    }
  };

  return (
    <BattleDialog
      session={session}
      view={view}
      paused={paused}
      done={savedId !== null}
      onPause={() => setPaused((value) => !value)}
      onSetDone={setDone}
      onFinish={() => {
        if (savedId !== null) {
          void navigate(resultOf(savedId), { replace: true, state: { fresh: true } });
        }
      }}
      onRetreat={() => setRetreating(true)}
    >
      {retreating && (
        <ConfirmDialog
          title={battleTexts.retreatTitle}
          text={view.retreatText}
          cancel={battleTexts.keepGoing}
          confirm={battleTexts.retreatConfirm}
          onConfirm={leave}
          onCancel={() => setRetreating(false)}
        />
      )}
      {unsaved !== null && (
        <Dialog title={battleTexts.saveFailedTitle} onClose={() => setUnsaved(null)}>
          <p className="dialog__text">{battleTexts.saveFailed}</p>
          <div className="dialog__actions">
            <button
              type="button"
              className="button button--primary button--large"
              onClick={() => {
                setUnsaved(null);
                finishing.current = true;
                finish(unsaved.session, unsaved.leaving);
              }}
            >
              {commonTexts.retry}
            </button>
          </div>
        </Dialog>
      )}
    </BattleDialog>
  );
}

function BattleDialog<TSession extends Session>({
  session,
  view,
  paused,
  done,
  onPause,
  onSetDone,
  onFinish,
  onRetreat,
  children,
}: {
  session: TSession;
  view: BattleView<TSession>;
  paused: boolean;
  done: boolean;
  onPause: () => void;
  onSetDone: () => void;
  onFinish: () => void;
  onRetreat: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { stages } = session;
  const index = nextStageIndex(session);
  const current = index ?? stages.length - 1;
  const doneReps = stages.reduce((total, stage) => total + (stage.done === true ? stage.target : 0), 0);
  const total = stages.reduce((sum, stage) => sum + stage.target, 0);
  const finished = index === null;
  const set = view.current(session, current);

  // The battle covers the whole screen: the page behind it waits, and Escape asks to retreat.
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();

    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="k-battle"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();

        if (!finished) {
          onRetreat();
        }
      }}
    >
      <div className="k-battle__top">
        <div className="k-battle__title">
          <h1 id={titleId} className="k-battle__name">
            {view.title(session)}
          </h1>
          <p className="k-battle__exercise">{view.subtitle(session)}</p>
        </div>
        {!finished && (
          <>
            <button
              type="button"
              className="k-battle__round"
              aria-label={paused ? battleTexts.resume : battleTexts.pause}
              aria-pressed={paused}
              onClick={onPause}
            >
              <KozakIcon name={paused ? 'play' : 'pause'} className="k-battle__round-icon" />
            </button>
            <button type="button" className="k-battle__retreat" onClick={onRetreat}>
              {battleTexts.retreat}
            </button>
          </>
        )}
      </div>
      <Progress stages={stages} current={finished ? null : current} />
      <p className="k-battle__count">
        <span>{battleTexts.doneReps}</span>
        <b>{battleTexts.doneOf(doneReps, total)}</b>
      </p>
      {paused && !finished && (
        <p className="k-battle__paused" role="status">
          {battleTexts.paused}
        </p>
      )}
      {finished ? (
        <>
          <div className="k-battle__center">
            <span className="k-battle__check" aria-hidden="true">
              <KozakIcon name="check" className="k-battle__check-icon" />
            </span>
            <p className="k-battle__done" role="status">
              {battleTexts.allDone}
            </p>
            <p className="k-battle__done-reps">{battleTexts.allDoneReps(total)}</p>
          </div>
          <button type="button" className="k-battle__main" disabled={!done} onClick={onFinish}>
            {battleTexts.finish}
          </button>
        </>
      ) : (
        <>
          <div className="k-battle__center" aria-live="polite">
            <p className="k-battle__label">{set.label}</p>
            <p className="k-battle__set">{set.value}</p>
            <span className="k-battle__divider" aria-hidden="true" />
            <p className="k-battle__label k-battle__label--gold">{set.repsLabel}</p>
            <p className="k-battle__reps">{stages[current]?.target}</p>
            <p className="k-battle__rest">{battleTexts.rest}</p>
          </div>
          <button type="button" className="k-battle__main" onClick={onSetDone}>
            {battleTexts.setDone}
          </button>
        </>
      )}
      {children}
    </dialog>
  );
}

// The sets as segments, done, current and ahead; a long fight shows one bar instead.
function Progress({ stages, current }: { stages: Session['stages']; current: number | null }) {
  const done = stages.filter((stage) => stage.done !== null).length;
  const common = {
    role: 'progressbar',
    'aria-label': battleTexts.progress,
    'aria-valuemin': 0,
    'aria-valuemax': stages.length,
    'aria-valuenow': current === null ? stages.length : current,
  } as const;

  if (stages.length > SEGMENTS_MAX) {
    return (
      <div className="k-battle__bar" {...common}>
        <span className="k-battle__bar-fill" style={{ '--share': `${(done / stages.length) * 100}%` } as CSSProperties} />
      </div>
    );
  }

  return (
    <div className="k-battle__segments" style={{ '--count': stages.length } as CSSProperties} {...common}>
      {stages.map((stage, position) => (
        <span
          key={position}
          className={`k-battle__segment${stage.done !== null ? ' k-battle__segment--done' : position === current ? ' k-battle__segment--current' : ''}`}
        />
      ))}
    </div>
  );
}

// The screen must not go dark in the middle of a set (§6 of the spec): the Wake Lock keeps it on.
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let active = true;

    const request = () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
        return;
      }
      navigator.wakeLock.request('screen').then(
        (sentinel) => {
          if (active) {
            lock = sentinel;
          } else {
            void sentinel.release();
          }
        },
        () => undefined,
      );
    };

    request();
    // The browser drops the lock when the tab hides, so it is taken again on the way back.
    document.addEventListener('visibilitychange', request);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);
}
