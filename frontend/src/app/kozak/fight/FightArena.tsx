import { useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import type { WorkoutSession } from '../../../domain/engine/session';
import type { WorkoutAttempt } from '../../../domain/history/attempt';
import { enterBattle } from '../../../domain/kozak/battle';
import { laterFullAt } from '../../../domain/kozak/energy';
import { FIGHT_GLORY } from '../../../domain/kozak/glory';
import { standingOf } from '../../../domain/kozak/ranks';
import { battleTexts, fightHallTexts, rankNames, victoryTexts } from '../../../i18n/kozak';
import { commonTexts } from '../../../i18n/uk';
import { ArenaProvider, type Arena } from '../../arena';
import { useGame } from '../../game';
import { kozakPaths } from '../paths';
import { WithCossack } from '../parts';
import { useCossack, useFresh } from '../record';

/**
 * §24.6: the fights of the game are the workouts of the site in the colors of the game. Every
 * start takes a unit of the energy of fights, a fight left in the middle is lost, and a win adds
 * glory to the cossack.
 */
export function FightArena() {
  const { storage } = useGame();
  const { cossack } = useCossack();
  // The record of the server learns of a battle a moment after it starts: until then the screen
  // remembers the energy it has spent itself.
  const [spent, setSpent] = useState<string | null>(null);
  const record = cossack.status === 'ready' ? cossack.value.record : null;
  const arena = useMemo<Arena | null>(
    () =>
      record === null
        ? null
        : {
            paths: {
              modes: kozakPaths.fight,
              setup: kozakPaths.fightSetup,
              fight: kozakPaths.fightBattle,
              result: kozakPaths.fightResult,
            },
            back: {
              modes: { to: kozakPaths.fight, text: fightHallTexts.toHall },
              // The history is a screen of the site: it opens as a page.
              history: { to: '/workout/history', text: commonTexts.toHistory, site: true },
            },
            session: storage.gameSessions.fight,
            leaving: {
              kind: 'retreat',
              button: battleTexts.retreatConfirm,
              title: battleTexts.retreatTitle,
              text: fightHallTexts.retreatText,
              confirm: battleTexts.retreatConfirm,
              cancel: battleTexts.keepGoing,
            },
            begin(session: WorkoutSession) {
              // A fight in progress is finished or left first, so its energy is never lost.
              if (storage.gameSessions.fight.load() !== null) {
                return null;
              }
              const marked = enterBattle(session, 'fight', laterFullAt(record.energy.fight, spent));

              if (marked?.game != null) {
                setSpent(marked.game.energyFullAt);
              }

              return marked;
            },
            refusal: (
              <p className="notice notice--warning" role="alert">
                {storage.gameSessions.fight.load() === null ? fightHallTexts.refusal : fightHallTexts.busy}
              </p>
            ),
            resultNote: (attempt: WorkoutAttempt) => <FightGlory attempt={attempt} />,
          },
    [record, storage, spent],
  );

  if (arena === null) {
    return <WithCossack>{() => null}</WithCossack>;
  }

  return (
    <ArenaProvider arena={arena}>
      <Outlet />
    </ArenaProvider>
  );
}

// §24.3: a fight of the game won adds glory, and the result says when it brings a new rank.
function FightGlory({ attempt }: { attempt: WorkoutAttempt }) {
  const { cossack, current } = useCossack();
  const fresh = useFresh();

  if (attempt.game === null) {
    return null;
  }
  const won = attempt.result.outcome === 'win';
  const glory = cossack.status === 'ready' && current ? cossack.value.glory : null;
  const promoted =
    won && fresh && glory !== null && standingOf(glory - FIGHT_GLORY).rank.id !== standingOf(glory).rank.id
      ? standingOf(glory).rank.id
      : null;

  return (
    <div className={won ? 'k-glory-note k-glory-note--won' : 'k-glory-note'}>
      {won ? (
        <>
          <p className="k-glory-note__value">{fightHallTexts.glory(FIGHT_GLORY)}</p>
          <p className="k-glory-note__text">{fightHallTexts.gloryNote}</p>
        </>
      ) : (
        <p className="k-glory-note__text">{fightHallTexts.noGlory}</p>
      )}
      {promoted !== null && (
        <p className="k-glory-note__rank">
          {victoryTexts.newRank}: <b>{rankNames[promoted]}</b>
        </p>
      )}
    </div>
  );
}
