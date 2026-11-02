import type { Mode } from '../domain/config/types';

// Screens of the game under /workout. Symfony knows the same list (GameShellController).
export const paths = {
  modes: '/',
  setup: (mode: Mode) => `/setup/${mode}`,
  fight: '/fight',
  result: (id: string) => `/result/${id}`,
  history: '/history',
  account: '/account',
};

export const MODES: readonly Mode[] = ['target', 'random-opponent', 'opponent-levels', 'ladder'];

export function isMode(value: string | undefined): value is Mode {
  return MODES.some((mode) => mode === value);
}
