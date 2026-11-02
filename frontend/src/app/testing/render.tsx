import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { pullUps, pushUps, seededRng, squats, STARTED_AT } from '../../domain/testing/fixtures';
import type { GameStorage } from '../../storage/contract';
import { newId } from '../../storage/ids';
import { createMemoryStorage } from '../../storage/memory';
import { App } from '../App';
import type { Game } from '../game';

export const READY_MADE = [pushUps, squats, pullUps];

// A clock that moves a second per call, so attempts get distinct times.
export function testClock(start = STARTED_AT): () => Date {
  let now = start.getTime();

  return () => new Date((now += 1000));
}

// Renders the game at a path under /workout, with storage in memory and fixed randomness.
export function renderGame(path: string, options: { storage?: GameStorage; seed?: number } = {}) {
  const storage = options.storage ?? createMemoryStorage();
  const game: Game = {
    storage,
    exercises: READY_MADE,
    deps: { rng: seededRng(options.seed ?? 7), now: testClock(), newId },
  };
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App game={game} />
    </MemoryRouter>,
  );

  return { ...view, storage, user };
}
