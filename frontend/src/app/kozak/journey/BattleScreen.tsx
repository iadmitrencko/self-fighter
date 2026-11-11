import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { nextStageIndex, type CampaignSession } from '../../../domain/engine/session';
import { finalize } from '../../../domain/history/attempt';
import { completeSet, retreat } from '../../../domain/kozak/battle';
import { totalReps } from '../../../domain/kozak/journey';
import { battleTexts, levelText } from '../../../i18n/kozak';
import { commonTexts } from '../../../i18n/uk';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { useGame } from '../../game';
import { kozakPaths } from '../paths';
import { KozakIcon } from '../parts';
import { scheme } from './common';

/**
 * Screen 6 of kozak_design: one set after another, as big as can be read from two meters. There
 * is no timer: the player rests as long as needed and says when a set is done (§24.5).
 */
export function BattleScreen() {
  const { storage, deps } = useGame();
  const navigate = useNavigate();
  const [session, setSession] = useState<CampaignSession | null>(() => storage.gameSessions.campaign.load());
  const [paused, setPaused] = useState(false);
  const [retreating, setRetreating] = useState(false);
  // A battle the browser could not keep, and whether the player stays to finish it or leaves it.
  const [unsaved, setUnsaved] = useState<{ session: CampaignSession; leaving: boolean } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const finishing = useRef(false);

  useWakeLock();

  if (session === null) {
    return <Navigate to={kozakPaths.journey} replace />;
  }

  // The attempt waits in the browser first, so a battle won without the network still counts (§15.4).
  const finish = (finished: CampaignSession, leaving: boolean) => {
    const attempt = finalize(finished, deps.now());

    storage.attempts.save(attempt).then(
      () => {
        storage.gameSessions.campaign.clear();

        if (leaving) {
          void navigate(kozakPaths.outcome(attempt.id), { replace: true, state: { fresh: true } });
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
      storage.gameSessions.campaign.save(next);
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
      paused={paused}
      done={savedId !== null}
      onPause={() => setPaused((value) => !value)}
      onSetDone={setDone}
      onFinish={() => {
        if (savedId !== null) {
          void navigate(kozakPaths.outcome(savedId), { replace: true, state: { fresh: true } });
        }
      }}
      onRetreat={() => setRetreating(true)}
    >
      {retreating && (
        <ConfirmDialog
          title={battleTexts.retreatTitle}
          text={battleTexts.retreatText}
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

function BattleDialog({
  session,
  paused,
  done,
  onPause,
  onSetDone,
  onFinish,
  onRetreat,
  children,
}: {
  session: CampaignSession;
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
  const { config, stages } = session;
  const index = nextStageIndex(session);
  const current = index ?? stages.length - 1;
  const doneReps = stages.reduce((total, stage) => total + (stage.actual === stage.target ? stage.target : 0), 0);
  const total = totalReps(config);
  const finished = index === null;
  const name = levelText(config.level).name;

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
            {name}
          </h1>
          <p className="k-battle__exercise">{battleTexts.exercise(config.exercise.name, scheme(config.sets))}</p>
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
      <div
        className="k-battle__segments"
        style={{ '--count': stages.length } as CSSProperties}
        role="progressbar"
        aria-label={battleTexts.progress}
        aria-valuemin={0}
        aria-valuemax={stages.length}
        aria-valuenow={finished ? stages.length : current}
      >
        {stages.map((stage, position) => (
          <span
            key={position}
            className={`k-battle__segment${stage.actual !== null ? ' k-battle__segment--done' : position === current && !finished ? ' k-battle__segment--current' : ''}`}
          />
        ))}
      </div>
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
            <p className="k-battle__label">{battleTexts.set}</p>
            <p className="k-battle__set">
              {current + 1} <span>/ {stages.length}</span>
            </p>
            <span className="k-battle__divider" aria-hidden="true" />
            <p className="k-battle__label k-battle__label--gold">{battleTexts.doReps}</p>
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
