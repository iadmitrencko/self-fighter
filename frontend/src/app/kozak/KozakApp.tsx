import { useMemo, useState } from 'react';
import { NavLink, Outlet, Route, Routes, useParams } from 'react-router';
import { kozakTexts, rankNames } from '../../i18n/kozak';
import { ResultScreen } from '../screens/ResultScreen';
import { SetupScreen } from '../setup/SetupScreen';
import { WorkoutScreen } from '../workout/WorkoutScreen';
import { ScrollToTop, SiteLinks } from '../components/routing';
import { DataVersionContext } from '../data';
import { GameProvider, type Game } from '../game';
import { isMode } from '../paths';
import { CossackScreen } from './CossackScreen';
import { FightArena } from './fight/FightArena';
import { FightHall } from './fight/FightHall';
import { BattleScreen } from './journey/BattleScreen';
import { CampaignScreen } from './journey/CampaignScreen';
import { KozakNotFound } from './journey/common';
import { JourneyScreen } from './journey/JourneyScreen';
import { OutcomeScreen } from './journey/OutcomeScreen';
import { PrepScreen } from './journey/PrepScreen';
import { StageScreen } from './journey/StageScreen';
import { KOZAK_BASE, kozakPaths } from './paths';
import { EnergyMeter, KozakIcon, type KozakIconName } from './parts';
import { CossackProvider, useCossack, useNow } from './record';

// §24: the section «Гра» under /game, the cossack game of the site.
export function KozakApp({ game }: { game: Game }) {
  const [version, setVersion] = useState(0);
  const data = useMemo(() => ({ version, changed: () => setVersion((value) => value + 1) }), [version]);

  return (
    <GameProvider game={game}>
      <DataVersionContext value={data}>
        <ScrollToTop />
        <SiteLinks base={KOZAK_BASE} />
        <CossackProvider>
          <Routes>
            {/* The battle of a level covers the whole screen. */}
            <Route path="journey/battle" element={<BattleScreen />} />
            <Route element={<KozakLayout />}>
              <Route index element={<CossackScreen />} />
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
        </CossackProvider>
      </DataVersionContext>
    </GameProvider>
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
];

// The sections of the game on the left, as tabs above the screen on a phone.
function KozakLayout() {
  return (
    <div className="kozak">
      <div className="kozak__aside">
        <nav className="kozak-nav" aria-label={kozakTexts.section}>
          {SECTIONS.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="kozak-nav__link">
              <KozakIcon name={icon} className="kozak-nav__icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <SideStatus />
      </div>
      <div className="kozak__main">
        <Outlet />
      </div>
    </div>
  );
}

// The rank, the glory and the energy of the cossack beside every screen of a wide display.
function SideStatus() {
  const { cossack } = useCossack();
  const now = useNow();

  if (cossack.status !== 'ready') {
    return null;
  }
  const { standing, glory, energy } = cossack.value;

  return (
    <section className="kozak-status" aria-label={kozakTexts.nav.cossack}>
      <p className="kozak-status__rank">
        <span className="k-eyebrow">{kozakTexts.rank}</span>
        <b>{rankNames[standing.rank.id]}</b>
      </p>
      <p className="kozak-status__glory">
        <span className="k-eyebrow">{kozakTexts.glory}</span>
        <b>
          <KozakIcon name="glory" className="kozak-status__icon" />
          {glory}
        </b>
      </p>
      <EnergyMeter pool="fight" energy={energy('fight', now)} now={now} compact />
      <EnergyMeter pool="campaign" energy={energy('campaign', now)} now={now} compact />
    </section>
  );
}
