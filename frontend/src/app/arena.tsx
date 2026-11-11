import { createContext, use, useMemo, type ReactNode } from 'react';
import type { Mode } from '../domain/config/types';
import type { WorkoutSession } from '../domain/engine/session';
import type { WorkoutAttempt } from '../domain/history/attempt';
import { fightTexts } from '../i18n/uk';
import type { ActiveSessionStore } from '../storage/contract';
import { BACK, type Back } from './components/Screen';
import { useGame } from './game';
import { paths } from './paths';

/**
 * How the player leaves an attempt in the middle: the site forgets it (§12.4), the game counts
 * it lost, so the energy it took stays spent (§24.6).
 */
export interface Leaving {
  readonly kind: 'discard' | 'retreat';
  readonly button: string;
  readonly title: string;
  readonly text: string;
  readonly confirm: string;
  readonly cancel: string;
}

export const DISCARD: Leaving = {
  kind: 'discard',
  button: fightTexts.interrupt,
  title: fightTexts.interruptTitle,
  text: fightTexts.interruptText,
  confirm: fightTexts.interrupt,
  cancel: fightTexts.keepGoing,
};

export interface ArenaPaths {
  readonly modes: string;
  setup(mode: Mode): string;
  readonly fight: string;
  result(id: string): string;
}

/**
 * Where the screens of a workout run: on /workout for the site, or in the fights of the cossack
 * game (§24.6), which spend energy on every start and keep their own attempt in progress.
 */
export interface Arena {
  readonly paths: ArenaPaths;
  readonly back: { readonly modes: Back; readonly history: Back };
  // The attempt in progress of this arena.
  readonly session: ActiveSessionStore<WorkoutSession>;
  readonly leaving: Leaving;
  // Takes every new session before it starts. null refuses the start, and `refusal` says why.
  readonly begin: (session: WorkoutSession) => WorkoutSession | null;
  readonly refusal: ReactNode;
  // What the result of an attempt adds in this arena, such as the glory of the game.
  readonly resultNote: ((attempt: WorkoutAttempt) => ReactNode) | null;
}

const ArenaContext = createContext<Arena | null>(null);

export function ArenaProvider({ arena, children }: { arena: Arena; children: ReactNode }) {
  return <ArenaContext value={arena}>{children}</ArenaContext>;
}

// Without a provider the screens work for the workouts of the site.
export function useArena(): Arena {
  const arena = use(ArenaContext);
  const { storage } = useGame();
  const site = useMemo<Arena>(
    () => ({
      paths,
      back: { modes: BACK.modes, history: BACK.history },
      session: storage.activeSession,
      leaving: DISCARD,
      begin: (session) => session,
      refusal: null,
      resultNote: null,
    }),
    [storage],
  );

  return arena ?? site;
}
