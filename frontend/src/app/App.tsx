import { useLayoutEffect } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router';
import { notFoundTexts } from '../i18n/uk';
import { Screen, Title } from './components/Screen';
import { GameProvider, type Game } from './game';
import { isMode, paths } from './paths';
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
      <Routes>
        <Route index element={<ModesScreen />} />
        <Route path="setup/:mode" element={<SetupRoute />} />
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

// A new screen starts at its top, as a new page would.
function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function NotFound() {
  return (
    <Screen title={notFoundTexts.title}>
      <Title className="screen-title">{notFoundTexts.title}</Title>
      <p>{notFoundTexts.text}</p>
      <div className="screen__actions">
        <Link className="button button--primary button--large" to={paths.modes}>
          {notFoundTexts.back}
        </Link>
      </div>
    </Screen>
  );
}
