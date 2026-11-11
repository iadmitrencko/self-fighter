import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router';
import { notFoundTexts } from '../i18n/uk';
import { showScore } from '../score/score';
import { RouterBase, ScrollToTop, SiteLinks } from './components/routing';
import { BACK, Screen, ScreenHead } from './components/Screen';
import { SignInOutcome, SignInPromptProvider } from './components/SignIn';
import { DataVersionContext, useDataVersion } from './data';
import { GameProvider, useGame, type Game } from './game';
import { BASE, isMode } from './paths';
import { ModesScreen } from './screens/ModesScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SetupScreen } from './setup/SetupScreen';
import { WorkoutScreen } from './workout/WorkoutScreen';

// The screens of the game under /workout (section 3.4 of the plan). The history and the data of the
// player live in the game (§24.1).
export function App({ game }: { game: Game }) {
  const [version, setVersion] = useState(0);
  const data = useMemo(() => ({ version, changed: () => setVersion((value) => value + 1) }), [version]);

  return (
    <GameProvider game={game}>
      <DataVersionContext value={data}>
        <RouterBase value={BASE}>
          <SignInPromptProvider>
            <ScrollToTop />
            <SiteLinks base={BASE} />
            <ScoreSync />
            <SignInOutcome />
            <Routes>
              <Route index element={<ModesScreen />} />
              <Route path="setup/:mode" element={<SetupRoute />} />
              <Route path="challenge/:slug" element={<ChallengeRoute />} />
              <Route path="fight" element={<WorkoutScreen />} />
              <Route path="result/:id" element={<ResultScreen />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SignInPromptProvider>
        </RouterBase>
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

function NotFound() {
  return (
    <Screen title={notFoundTexts.title}>
      <ScreenHead back={BACK.modes} title={notFoundTexts.title} />
      <p>{notFoundTexts.text}</p>
    </Screen>
  );
}
