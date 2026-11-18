import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router';
import type { EnergyPool } from '../../domain/kozak/energy';
import { formatCount } from '../../i18n/format';
import { energyStatus, energyTexts, formatWait, gloryTexts, kozakTexts, rankNames, statusTexts } from '../../i18n/kozak';
import { accountTexts, storageMessages } from '../../i18n/uk';
import { useSignOut } from '../components/SignOut';
import { useGame } from '../game';
import { useLoad } from '../useLoad';
import { kozakPaths } from './paths';
import { KozakIcon, type KozakIconName } from './parts';
import { useCossack, useNow, type Cossack } from './record';

/**
 * §24.1: inside the game the header of the site is the status of the cossack instead of a second
 * menu of its sections: his rank with the way to the next one, the energy of fights and of the
 * journey, and the menu of the player. Twig draws the header with the logo (kozak/shell.html.twig),
 * and this fills in the rest.
 */
export function GameStatus() {
  const [target] = useState(() => document.getElementById('game-status'));
  const status = <Status />;

  // The tests render the game without the page of Symfony around it.
  return target === null ? status : createPortal(status, target);
}

function Status() {
  const { cossack } = useCossack();
  const now = useNow();

  return (
    <div className="game-status" role="group" aria-label={statusTexts.label}>
      {cossack.status === 'ready' && (
        <>
          <RankBadge cossack={cossack.value} />
          <EnergyPill pool="fight" cossack={cossack.value} now={now} />
          <EnergyPill pool="campaign" cossack={cossack.value} now={now} />
        </>
      )}
      <PlayerMenu place="header" />
    </div>
  );
}

// §24.2: the rank and the glory of the cossack over a thin bar of the way from that rank to the next
// one, as on the screens of the cossack and of the ranks; its hint says how much more the next rank
// needs, and it leads to all the ranks. The star of the glory tells it from the energy.
function RankBadge({ cossack: { glory, standing } }: { cossack: Cossack }) {
  const tipId = useId();
  const { rank, next } = standing;
  const name = rankNames[rank.id];
  const share = next === null ? 1 : (glory - rank.glory) / (next.glory - rank.glory);

  return (
    <span className="game-rank">
      <Link className="game-pill game-rank__link" to={kozakPaths.ranks} aria-describedby={tipId}>
        <KozakIcon name="glory" className="game-pill__icon game-rank__icon" />
        <span className="game-pill__name game-rank__name" aria-hidden="true">
          {name}
        </span>
        <b className="game-pill__value" aria-hidden="true">
          {formatCount(glory)}
        </b>
        <span className="visually-hidden">{statusTexts.rank(name, glory)}</span>
        <span className="game-rank__bar" aria-hidden="true" style={{ '--share': `${share * 100}%` } as CSSProperties} />
      </Link>
      {/* Outside the link, so it describes the link instead of adding to its name. */}
      <span id={tipId} className="game-tip game-rank__tip" role="tooltip">
        {next === null ? gloryTexts.top : gloryTexts.left(next.glory - glory, rankNames[next.id])}
      </span>
    </span>
  );
}

// The battles of a pool with the name and the icon of their section, the same as in the column and
// the bar of the sections, so the two pills differ at a glance.
const POOLS: Readonly<Record<EnergyPool, { to: string; icon: KozakIconName; name: string }>> = {
  fight: { to: kozakPaths.fight, icon: 'fight', name: kozakTexts.nav.fight },
  campaign: { to: kozakPaths.journey, icon: 'journey', name: kozakTexts.nav.journey },
};

// §24.4: a pool of energy, when its next unit comes back, and the way to its battles. A small bolt
// beside the number tells the energy where the pill has room for the name as well.
function EnergyPill({ pool, cossack, now }: { pool: EnergyPool; cossack: Cossack; now: Date }) {
  const tipId = useId();
  const energy = cossack.energy(pool, now);
  const { name, every } = energyTexts[pool];
  const tip = energy.nextAt === null ? every : energyStatus.next(formatWait(Date.parse(energy.nextAt) - now.getTime()));

  return (
    <span className={energy.value === 0 ? 'game-energy game-energy--empty' : 'game-energy'}>
      <Link className="game-pill" to={POOLS[pool].to} aria-describedby={tipId}>
        <KozakIcon name={POOLS[pool].icon} className="game-pill__icon" />
        <span className="game-pill__name" aria-hidden="true">
          {POOLS[pool].name}
        </span>
        <b className="game-pill__value" aria-hidden="true">
          <KozakIcon name="bolt" className="game-energy__bolt" />
          {energy.value}/{energy.max}
        </b>
        <span className="visually-hidden">{energyStatus.named(name, energy.value, energy.max)}</span>
      </Link>
      {/* Outside the link, so it describes the link instead of adding to its name. */}
      <span id={tipId} className="game-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

/**
 * The menu of the player: whose account is open, the settings and signing out. A wide screen shows it
 * in the header beside the energy; on a phone it is «Ще» in the bar of the sections, which keeps the
 * history there as well. The site is a tap on the logo away, as from every page.
 */
export function PlayerMenu({ place }: { place: 'header' | 'tabs' }) {
  const { storage } = useGame();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [user] = useLoad(loadUser);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // The way in says that the account has left (§23.1).
  const signOut = useSignOut({
    onDone: (notice) => void navigate(kozakPaths.cossack, { state: { notice } }),
    onFailure: (error) => {
      setFailure(storageMessages[error]);
      setOpen(true);
    },
  });
  const account = user.status === 'ready' ? user.value : null;
  const initial = (account?.name ?? account?.email ?? '').trim().charAt(0).toUpperCase();
  const close = () => setOpen(false);
  const current = (path: string) => (pathname === path ? 'page' : undefined);

  // Escape or a tap elsewhere closes the menu.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && box.current?.contains(event.target) === true)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // The history and the settings live behind «Ще» on a phone, so it stands out while one of them is open.
  const inside = pathname === kozakPaths.history || pathname === kozakPaths.settings;

  return (
    <div ref={box} className={`player-menu player-menu--${place}`}>
      <button
        ref={button}
        type="button"
        className={place === 'header' ? 'player-menu__trigger' : inside ? 'kozak-nav__link kozak-nav__link--inside' : 'kozak-nav__link'}
        aria-label={place === 'header' ? statusTexts.menu : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {place === 'header' ? (
          <>
            <span className="player-menu__avatar" aria-hidden="true">
              {initial === '' ? <KozakIcon name="cossack" className="player-menu__face" /> : initial}
            </span>
            <KozakIcon name="chevron" className="player-menu__chevron" />
          </>
        ) : (
          <>
            <span className="player-menu__mark">
              <KozakIcon name="more" className="kozak-nav__icon" />
            </span>
            <span>{kozakTexts.nav.more}</span>
          </>
        )}
      </button>
      {/* Closed, the panel keeps nothing, so its words do not stand twice beside the screen. */}
      <div id={panelId} className="player-menu__panel" hidden={!open}>
        {open && (
          <>
            {failure !== null && (
              <p className="player-menu__failure" role="alert">
                {failure}
              </p>
            )}
            {account !== null && (account.name !== null || account.email !== null) && (
              <p className="player-menu__who">
                {account.name !== null && <span className="player-menu__name">{account.name}</span>}
                {account.email !== null && <span className="player-menu__email">{account.email}</span>}
              </p>
            )}
            <ul className="player-menu__list" role="list">
              {/* The bar of a phone has no room for the history; a wide screen keeps it in the column of the sections. */}
              {place === 'tabs' && (
                <li>
                  <Link className="player-menu__item" to={kozakPaths.history} aria-current={current(kozakPaths.history)} onClick={close}>
                    <KozakIcon name="history" className="player-menu__icon" />
                    {kozakTexts.nav.history}
                  </Link>
                </li>
              )}
              <li>
                <Link className="player-menu__item" to={kozakPaths.settings} aria-current={current(kozakPaths.settings)} onClick={close}>
                  <KozakIcon name="settings" className="player-menu__icon" />
                  {kozakTexts.nav.settings}
                </Link>
              </li>
              {account !== null && (
                <li className="player-menu__end">
                  {/* Quieter than the rest, so it is not tapped by chance. */}
                  <button
                    type="button"
                    className="player-menu__item player-menu__item--quiet"
                    disabled={signOut.busy}
                    onClick={() => {
                      close();
                      setFailure(null);
                      signOut.start();
                    }}
                  >
                    <KozakIcon name="leave" className="player-menu__icon" />
                    {accountTexts.signOut}
                  </button>
                </li>
              )}
            </ul>
          </>
        )}
      </div>
      {signOut.dialog}
    </div>
  );
}
