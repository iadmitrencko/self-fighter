import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router';
import { kozakTexts } from '../../i18n/kozak';
import { ResultScreen } from '../screens/ResultScreen';
import { SetupScreen } from '../setup/SetupScreen';
import { WorkoutScreen } from '../workout/WorkoutScreen';
import { ScrollToTop, SiteLinks } from '../components/routing';
import { SignInOutcome, SignInPromptProvider } from '../components/SignIn';
import { DataVersionContext } from '../data';
import { GameProvider, type Game } from '../game';
import { CossackScreen } from './CossackScreen';
import { FightArena } from './fight/FightArena';
import { FightHall } from './fight/FightHall';
import { HistoryScreen } from './HistoryScreen';
import { BattleScreen } from './journey/BattleScreen';
import { CampaignScreen } from './journey/CampaignScreen';
import { KozakNotFound } from './journey/common';
import { JourneyScreen } from './journey/JourneyScreen';
import { OutcomeScreen } from './journey/OutcomeScreen';
import { PrepScreen } from './journey/PrepScreen';
import { StageScreen } from './journey/StageScreen';
import { isMode, KOZAK_BASE, kozakPaths } from './paths';
import { KozakIcon, type KozakIconName } from './parts';
import { RanksScreen } from './RanksScreen';
import { SettingsScreen } from './SettingsScreen';
import { CossackProvider } from './record';

// §24: the section «Гра» under /game, the cossack game of the site and the only place of its workouts.
export function KozakApp({ game }: { game: Game }) {
  const [version, setVersion] = useState(0);
  const data = useMemo(() => ({ version, changed: () => setVersion((value) => value + 1) }), [version]);

  return (
    <GameProvider game={game}>
      <DataVersionContext value={data}>
        <SignInPromptProvider>
          <ScrollToTop />
          <SiteLinks base={KOZAK_BASE} />
          {/* §23.2: Google brings the browser back to the screen the sign-in started from. */}
          <SignInOutcome />
          <CossackProvider>
            <KozakRoutes />
          </CossackProvider>
        </SignInPromptProvider>
      </DataVersionContext>
    </GameProvider>
  );
}

function KozakRoutes() {
  return (
    <Routes>
      {/* The battle of a level covers the whole screen. */}
      <Route path="journey/battle" element={<BattleScreen />} />
      <Route element={<KozakLayout />}>
        <Route index element={<CossackScreen />} />
        <Route path="ranks" element={<RanksScreen />} />
        <Route path="history" element={<HistoryScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="fight" element={<FightArena />}>
          <Route index element={<FightHall />} />
          <Route path="setup/:mode" element={<FightSetup />} />
          <Route path="battle" element={<WorkoutScreen />} />
          <Route path="result/:id" element={<ResultScreen />} />
        </Route>
        <Route path="journey">
          <Route index element={<JourneyScreen />} />
          <Route path="result/:id" element={<OutcomeScreen />} />
          <Route path=":campaign" element={<CampaignScreen />} />
          <Route path=":campaign/:stage" element={<StageScreen />} />
          <Route path=":campaign/:stage/:level" element={<PrepScreen />} />
        </Route>
        <Route path="*" element={<KozakNotFound />} />
      </Route>
    </Routes>
  );
}

function FightSetup() {
  const { mode } = useParams();

  return isMode(mode) ? <SetupScreen key={mode} mode={mode} /> : <KozakNotFound />;
}

const SECTIONS: readonly { to: string; icon: KozakIconName; label: string; end: boolean }[] = [
  { to: kozakPaths.cossack, icon: 'cossack', label: kozakTexts.nav.cossack, end: true },
  { to: kozakPaths.fight, icon: 'fight', label: kozakTexts.nav.fight, end: false },
  { to: kozakPaths.journey, icon: 'journey', label: kozakTexts.nav.journey, end: false },
  { to: kozakPaths.ranks, icon: 'ranks', label: kozakTexts.nav.ranks, end: false },
  { to: kozakPaths.history, icon: 'history', label: kozakTexts.nav.history, end: false },
  { to: kozakPaths.settings, icon: 'settings', label: kozakTexts.nav.settings, end: false },
];

// The sections of the game on the left, as tabs above the screen on a phone.
function KozakLayout() {
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // Six tabs do not fit a phone, so they scroll sideways: the open one comes into view.
  useLayoutEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <div className="kozak">
      <div className="kozak__aside">
        <nav ref={nav} className="kozak-nav" aria-label={kozakTexts.section}>
          {SECTIONS.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="kozak-nav__link">
              <KozakIcon name={icon} className="kozak-nav__icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="kozak__main">
        <Outlet />
      </div>
    </div>
  );
}
