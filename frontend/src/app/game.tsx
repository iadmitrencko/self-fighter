import { createContext, use, type ReactNode } from 'react';
import type { Analytics } from '../analytics/events';
import type { ExerciseRef } from '../domain/catalog/exercise';
import type { SessionDeps } from '../domain/engine/session';
import type { GameStorage } from '../storage/contract';

// What every screen may use: the data of the player, the events of §19, the ready-made exercises,
// the ways to sign in, and the sources of randomness, time and ids that tests replace.
export interface Game {
  readonly storage: GameStorage;
  readonly analytics: Analytics;
  readonly exercises: readonly ExerciseRef[];
  // The ways to sign in this server offers (§23.2), such as ['google'].
  readonly signIn: readonly string[];
  readonly deps: SessionDeps;
}

const GameContext = createContext<Game | null>(null);

export function GameProvider({ game, children }: { game: Game; children: ReactNode }) {
  return <GameContext value={game}>{children}</GameContext>;
}

export function useGame(): Game {
  const game = use(GameContext);

  if (game === null) {
    throw new Error('useGame() needs a GameProvider.');
  }

  return game;
}

// Symfony puts the ready-made exercises (§5.1) and the ways to sign in into the page, so the game
// needs no request for them.
export function readPage(root: HTMLElement): Pick<Game, 'exercises' | 'signIn'> {
  const data: unknown = JSON.parse(root.dataset.game ?? '{}');
  const exercises = isRecord(data) && Array.isArray(data.exercises) ? data.exercises : [];
  const signIn = isRecord(data) && Array.isArray(data.signIn) ? data.signIn : [];

  return {
    exercises: exercises.filter(
      (exercise): exercise is ExerciseRef =>
        isRecord(exercise) && typeof exercise.id === 'string' && typeof exercise.name === 'string',
    ),
    signIn: signIn.filter((method): method is string => typeof method === 'string'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
