import { createContext, use, type ReactNode } from 'react';
import type { Mode } from '../domain/config/types';
import type { WorkoutSession } from '../domain/engine/session';
import type { WorkoutAttempt } from '../domain/history/attempt';
import type { ActiveSessionStore } from '../storage/contract';
import type { Back } from './components/Screen';

/**
 * How the player leaves a fight in the middle. It counts as lost, so the energy it took stays
 * spent (§24.6): the arena says so on the button and in the question before it.
 */
export interface Leaving {
  readonly button: string;
  readonly title: string;
  readonly text: string;
  readonly confirm: string;
  readonly cancel: string;
}

export interface ArenaPaths {
  readonly modes: string;
  setup(mode: Mode): string;
  readonly fight: string;
  result(id: string): string;
  // A level of the journey has a result of its own, which tells its story (§24.5).
  levelResult(id: string): string;
}

/**
 * Where the screens of a workout run: the fights of the cossack game (§24.6), which spend energy on
 * every start and keep their own attempt in progress. The screens know the game through it only.
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
  readonly resultNote: (attempt: WorkoutAttempt) => ReactNode;
}

const ArenaContext = createContext<Arena | null>(null);

export function ArenaProvider({ arena, children }: { arena: Arena; children: ReactNode }) {
  return <ArenaContext value={arena}>{children}</ArenaContext>;
}

export function useArena(): Arena {
  const arena = use(ArenaContext);

  if (arena === null) {
    throw new Error('The screens of a workout run inside an arena.');
  }

  return arena;
}
