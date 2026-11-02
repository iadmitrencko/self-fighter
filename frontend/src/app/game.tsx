import { createContext, use, type ReactNode } from 'react';
import type { ExerciseRef } from '../domain/catalog/exercise';
import type { SessionDeps } from '../domain/engine/session';
import type { GameStorage } from '../storage/contract';

// What every screen may use: the data of the player, the ready-made exercises from the page
// and the sources of randomness, time and ids that tests replace.
export interface Game {
  readonly storage: GameStorage;
  readonly exercises: readonly ExerciseRef[];
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

// Symfony puts the ready-made exercises (§5.1) into the page, so the game needs no request for them.
export function readExercises(root: HTMLElement): ExerciseRef[] {
  const data: unknown = JSON.parse(root.dataset.game ?? '{}');
  const exercises = isRecord(data) && Array.isArray(data.exercises) ? data.exercises : [];

  return exercises.filter(
    (exercise): exercise is ExerciseRef =>
      isRecord(exercise) && typeof exercise.id === 'string' && typeof exercise.name === 'string',
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
