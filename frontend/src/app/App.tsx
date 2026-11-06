import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { notFoundTexts, signInTexts, storageMessages } from '../i18n/uk';
import { showScore } from '../score/score';
import type { StorageErrorCode } from '../storage/errors';
import { ConfirmDialog } from './components/Dialog';
import { BACK, Screen, ScreenHead } from './components/Screen';
import { SignInPromptProvider } from './components/SignIn';
import { DataVersionContext, useDataVersion } from './data';
import { GameProvider, useGame, type Game } from './game';
import { BASE, isMode } from './paths';
import { AccountScreen } from './screens/AccountScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ModesScreen } from './screens/ModesScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SetupScreen } from './setup/SetupScreen';
import { isWorthJoining, readSignInOutcome, withoutSignInOutcome, type SignInOutcome } from './signIn';
import { errorCode, useLoad } from './useLoad';
import { WorkoutScreen } from './workout/WorkoutScreen';

// The screens of the game under /workout (section 3.4 of the plan).
export function App({ game }: { game: Game }) {
  const [version, setVersion] = useState(0);
  const data = useMemo(() => ({ version, changed: () => setVersion((value) => value + 1) }), [version]);

  return (
    <GameProvider game={game}>
      <DataVersionContext value={data}>
        <SignInPromptProvider>
          <ScrollToTop />
          <SiteLinks />
          <ScoreSync />
          <SignInOutcome />
          <Routes>
            <Route index element={<ModesScreen />} />
            <Route path="setup/:mode" element={<SetupRoute />} />
            <Route path="challenge/:slug" element={<ChallengeRoute />} />
            <Route path="fight" element={<WorkoutScreen />} />
            <Route path="result/:id" element={<ResultScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="account" element={<AccountScreen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SignInPromptProvider>
      </DataVersionContext>
    </GameProvider>
  );
}

function SetupRoute() {
  const { mode } = useParams();

  return isMode(mode) ? <SetupScreen key={mode} mode={mode} /> : <NotFound />;
}

// The page carries the challenge of its address only: another one needs its own page.
function ChallengeRoute() {
  const { slug } = useParams();
  const { challenge } = useGame();

  return challenge !== null && challenge.slug === slug ? (
    <SetupScreen key={slug} mode={challenge.config.mode} challenge={challenge} />
  ) : (
    <NotFound />
  );
}

// The score in the frame of the site follows the history: every screen and every change of the
// data read it again.
function ScoreSync() {
  const { storage } = useGame();
  const { pathname } = useLocation();
  const { version } = useDataVersion();

  useEffect(() => {
    let current = true;

    storage.attempts.stats().then(
      (stats) => current && showScore(stats),
      () => undefined,
    );

    return () => {
      current = false;
    };
  }, [storage, pathname, version]);

  return null;
}

/**
 * §23.2–§23.3: Google sends the browser back to the screen it left, and the address tells how the
 * sign-in went. A guest of this browser with data waits for the person to decide whether to join it.
 */
function SignInOutcome() {
  const { storage } = useGame();
  const { changed } = useDataVersion();
  const location = useLocation();
  const navigate = useNavigate();
  // Read once: the address forgets the outcome at once, so a reload does not tell it again.
  const [outcome] = useState(() => readSignInOutcome(location.search));
  const forgotten = useRef(false);
  const loadGuest = useCallback(
    () => (outcome === 'done' ? storage.account.keptGuest() : Promise.resolve(null)),
    [storage, outcome],
  );
  const [guest] = useLoad(loadGuest);
  const [closed, setClosed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);

  useEffect(() => {
    if (outcome !== null && !forgotten.current) {
      forgotten.current = true;
      void navigate(
        { pathname: location.pathname, search: withoutSignInOutcome(location.search), hash: location.hash },
        { replace: true },
      );
    }
  }, [outcome, navigate, location]);

  async function join() {
    setBusy(true);

    try {
      await storage.account.joinGuest();
      setJoined(true);
      changed();
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  if (outcome === null || closed || (outcome === 'done' && guest.status === 'loading')) {
    return null;
  }

  if (outcome === 'done' && guest.status === 'ready' && isWorthJoining(guest.value) && !joined && failure === null) {
    const { attempts, exercises } = guest.value;

    return (
      <ConfirmDialog
        title={signInTexts.joinTitle}
        text={signInTexts.joinText(attempts, exercises)}
        confirm={signInTexts.join}
        cancel={signInTexts.keepApart}
        tone="primary"
        busy={busy}
        onConfirm={() => void join()}
        onCancel={() => setClosed(true)}
      />
    );
  }

  const { tone, text } =
    failure !== null
      ? { tone: 'error', text: storageMessages[failure] }
      : joined
        ? { tone: 'done', text: signInTexts.joined }
        : OUTCOME_NOTICES[outcome];

  return (
    <div className="app-notice">
      <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
        <p>{text}</p>
        <button type="button" className="button button--outline" onClick={() => setClosed(true)}>
          {signInTexts.close}
        </button>
      </div>
    </div>
  );
}

const OUTCOME_NOTICES: Record<SignInOutcome, { tone: 'done' | 'warning' | 'error'; text: string }> = {
  done: { tone: 'done', text: signInTexts.done },
  cancelled: { tone: 'warning', text: signInTexts.cancelled },
  failed: { tone: 'error', text: signInTexts.failed },
};

// A new screen starts at its top, as a new page would.
function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/**
 * The header and the footer of the site lead to screens of the game as well. Inside the game they
 * open a screen without loading the page again, so they work offline in the middle of a workout.
 */
function SiteLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    const open = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;

      if (
        link === null ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target !== '' ||
        link.hasAttribute('download') ||
        link.origin !== window.location.origin ||
        (link.pathname !== BASE && !link.pathname.startsWith(`${BASE}/`))
      ) {
        return;
      }
      event.preventDefault();
      void navigate(`${link.pathname.slice(BASE.length) || '/'}${link.search}${link.hash}`);
    };

    document.addEventListener('click', open);

    return () => document.removeEventListener('click', open);
  }, [navigate]);

  return null;
}

function NotFound() {
  return (
    <Screen title={notFoundTexts.title}>
      <ScreenHead back={BACK.modes} title={notFoundTexts.title} />
      <p>{notFoundTexts.text}</p>
    </Screen>
  );
}
