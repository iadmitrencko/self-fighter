import { createContext, use, type ReactNode } from 'react';
import type { Analytics } from '../analytics/events';
import type { ChallengeRef } from '../domain/catalog/challenge';
import type { ExerciseRef } from '../domain/catalog/exercise';
import type { WorkoutConfig, WorkoutDraft } from '../domain/config/types';
import { validateConfig } from '../domain/config/validation';
import type { SessionDeps } from '../domain/engine/session';
import type { GameStorage } from '../storage/contract';

// A ready-made challenge of the site, opened at /workout/challenge/{slug} (§21.3).
export interface Challenge extends ChallengeRef {
  readonly config: WorkoutConfig;
}

// What every screen may use: the data of the player, the events of §19, the ready-made exercises
// and the challenge from the page, and the sources of randomness, time and ids that tests replace.
export interface Game {
  readonly storage: GameStorage;
  readonly analytics: Analytics;
  readonly exercises: readonly ExerciseRef[];
  readonly challenge: Challenge | null;
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

// Symfony puts the ready-made exercises (§5.1) and the opened challenge into the page, so the game
// needs no request for them.
export function readPage(root: HTMLElement): Pick<Game, 'exercises' | 'challenge'> {
  const data: unknown = JSON.parse(root.dataset.game ?? '{}');
  const exercises = isRecord(data) && Array.isArray(data.exercises) ? data.exercises : [];

  return {
    exercises: exercises.filter(
      (exercise): exercise is ExerciseRef =>
        isRecord(exercise) && typeof exercise.id === 'string' && typeof exercise.name === 'string',
    ),
    challenge: readChallenge(isRecord(data) ? data.challenge : undefined),
  };
}

// The configuration of a challenge passes the same check as the settings of a player (§21.3).
function readChallenge(value: unknown): Challenge | null {
  if (!isRecord(value) || typeof value.slug !== 'string' || typeof value.title !== 'string' || !isRecord(value.config)) {
    return null;
  }
  const validation = validateDamaged(value.config);

  return validation === null ? null : { slug: value.slug, title: value.title, config: validation };
}

// A configuration of a wrong shape is refused like an invalid one instead of breaking the game.
function validateDamaged(config: Record<string, unknown>): WorkoutConfig | null {
  try {
    const validation = validateConfig(config as unknown as WorkoutDraft);

    return validation.ok ? validation.config : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
