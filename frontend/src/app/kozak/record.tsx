import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { energyAt, laterFullAt, type Energy, type EnergyPool } from '../../domain/kozak/energy';
import { SICH } from '../../domain/kozak/journey';
import { journeyProgress, type JourneyProgress } from '../../domain/kozak/progress';
import { standingOf, type Standing } from '../../domain/kozak/ranks';
import { gloryOf } from '../../domain/kozak/glory';
import type { GameRecord } from '../../domain/kozak/record';
import type { GameSessions } from '../../storage/contract';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { errorCode, type Load } from '../useLoad';

// What the screens of the game know about the cossack, all derived from the record (§24.3).
export interface Cossack {
  readonly record: GameRecord;
  readonly glory: number;
  readonly standing: Standing;
  readonly progress: JourneyProgress;
  // The state of a pool counts the battle in progress of that pool as well.
  readonly fullAt: (pool: EnergyPool) => string | null;
  readonly energy: (pool: EnergyPool, now: Date) => Energy;
}

interface CossackLoad {
  readonly cossack: Load<Cossack>;
  // The record was read for this screen, so it already knows the battle that led here.
  readonly current: boolean;
  readonly reload: () => void;
}

const CossackContext = createContext<CossackLoad | null>(null);

/**
 * Every screen reads the record again, since a battle that has just ended changes it. Until the
 * new record arrives the screen keeps showing the previous one.
 */
export function CossackProvider({ children }: { children: ReactNode }) {
  const { storage } = useGame();
  const { pathname } = useLocation();
  const { version } = useDataVersion();
  const [run, setRun] = useState(0);
  const [{ record, loadedFor }, setLoaded] = useState<{ record: Load<GameRecord>; loadedFor: string | null }>({
    record: { status: 'loading' },
    loadedFor: null,
  });

  useEffect(() => {
    let current = true;

    storage.attempts.game().then(
      (value) => {
        if (current) {
          setLoaded({ record: { status: 'ready', value }, loadedFor: pathname });
        }
      },
      (error: unknown) => {
        if (current) {
          setLoaded({ record: { status: 'failed', error: errorCode(error) }, loadedFor: pathname });
        }
      },
    );

    return () => {
      current = false;
    };
  }, [storage, pathname, version, run]);

  const reload = useCallback(() => setRun((value) => value + 1), []);
  const value = useMemo<CossackLoad>(
    () => ({
      cossack: record.status === 'ready' ? { status: 'ready', value: describe(record.value, storage.gameSessions) } : record,
      current: loadedFor === pathname,
      reload,
    }),
    [record, loadedFor, pathname, storage, reload],
  );

  return <CossackContext value={value}>{children}</CossackContext>;
}

export function useCossack(): CossackLoad {
  const cossack = use(CossackContext);

  if (cossack === null) {
    throw new Error('useCossack() needs a CossackProvider.');
  }

  return cossack;
}

function describe(record: GameRecord, sessions: GameSessions): Cossack {
  const glory = gloryOf(SICH, record);
  const fullAt = (pool: EnergyPool) => laterFullAt(record.energy[pool], sessions[pool].load()?.game?.energyFullAt ?? null);

  return {
    record,
    glory,
    standing: standingOf(glory),
    progress: journeyProgress(SICH, record.passed),
    fullAt,
    energy: (pool, now) => energyAt(pool, fullAt(pool), now),
  };
}

// A screen opened right after its battle may tell what the battle has just changed, such as a new rank.
export function useFresh(): boolean {
  const location = useLocation();
  const state: unknown = location.state;

  return typeof state === 'object' && state !== null && 'fresh' in state && state.fresh === true;
}

// The time of the screens, renewed every half a minute, so the energy counts down by itself.
export function useNow(intervalMs = 30_000): Date {
  const { deps } = useGame();
  const [now, setNow] = useState(() => deps.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(deps.now()), intervalMs);

    return () => clearInterval(timer);
  }, [deps, intervalMs]);

  return now;
}
