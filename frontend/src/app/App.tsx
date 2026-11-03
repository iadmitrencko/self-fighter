import { useEffect, useLayoutEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { notFoundTexts } from '../i18n/uk';
import { showScore } from '../score/score';
import { BACK, Screen, ScreenHead } from './components/Screen';
import { GameProvider, useGame, type Game } from './game';
import { BASE, isMode } from './paths';
import { AccountScreen } from './screens/AccountScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ModesScreen } from './screens/ModesScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SetupScreen } from './setup/SetupScreen';
import { WorkoutScreen } from './workout/WorkoutScreen';

// The screens of the game under /workout (section 3.4 of the plan).
export function App({ game }: { game: Game }) {
  return (
    <GameProvider game={game}>
      <ScrollToTop />
      <SiteLinks />
      <ScoreSync />
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

// The score in the frame of the site follows the history: every screen reads it again.
function ScoreSync() {
  const { storage } = useGame();
  const { pathname } = useLocation();

  useEffect(() => {
    let current = true;

    storage.attempts.stats().then(
      (stats) => current && showScore(stats),
      () => undefined,
    );

    return () => {
      current = false;
    };
  }, [storage, pathname]);

  return null;
}

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
