import { createContext, use, useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import type { FightConfig } from '../../../domain/config/types';
import { createSession } from '../../../domain/engine/session';
import { enterBattle } from '../../../domain/kozak/battle';
import { laterFullAt } from '../../../domain/kozak/energy';
import { useGame } from '../../game';
import { WithCossack } from '../parts';
import { useCossack } from '../record';

// Why a fight does not start: the pool of fights is empty, or another fight is in progress.
export type FightRefusal = 'no-energy' | 'busy';

interface FightStart {
  // Starts the fight and keeps it in the browser, or says why it cannot start now.
  readonly start: (config: FightConfig) => FightRefusal | null;
}

const FightStartContext = createContext<FightStart | null>(null);

/**
 * §6, §24.4: the fights of the game. Every start takes a unit of the energy of fights, and one
 * fight goes at a time, so its energy is never lost. The hall and the result start fights here.
 */
export function FightArena() {
  const { storage, deps } = useGame();
  const { cossack } = useCossack();
  // The record of the server learns of a fight a moment after it starts: until then the screen
  // remembers the energy it has spent itself.
  const [spent, setSpent] = useState<string | null>(null);
  const record = cossack.status === 'ready' ? cossack.value.record : null;
  const fights = useMemo<FightStart | null>(
    () =>
      record === null
        ? null
        : {
            start(config) {
              if (storage.gameSessions.fight.load() !== null) {
                return 'busy';
              }
              const session = enterBattle(createSession(config, deps), 'fight', laterFullAt(record.energy.fight, spent));

              if (session === null) {
                return 'no-energy';
              }
              setSpent(session.game?.energyFullAt ?? null);
              storage.gameSessions.fight.save(session);

              return null;
            },
          },
    [record, storage, deps, spent],
  );

  if (fights === null) {
    return <WithCossack>{() => null}</WithCossack>;
  }

  return (
    <FightStartContext value={fights}>
      <Outlet />
    </FightStartContext>
  );
}

export function useFightStart(): FightStart {
  const fights = use(FightStartContext);

  if (fights === null) {
    throw new Error('A fight starts inside the FightArena.');
  }

  return fights;
}
