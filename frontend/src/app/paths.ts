import type { Mode } from '../domain/config/types';

// Screens of the game under /workout. Symfony knows the same list (GameShellController).
export const BASE = '/workout';

export const paths = {
  modes: '/',
  setup: (mode: Mode) => `/setup/${mode}`,
  fight: '/fight',
  result: (id: string) => `/result/${id}`,
};

// §24.1: the history lives in the game. From /workout it opens as a page.
export const HISTORY_PAGE = '/game/history';

export const MODES: readonly Mode[] = ['target', 'random-opponent', 'opponent-levels', 'ladder'];

export function isMode(value: string | undefined): value is Mode {
  return MODES.some((mode) => mode === value);
}
