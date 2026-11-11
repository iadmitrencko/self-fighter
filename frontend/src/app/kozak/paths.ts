import type { Mode } from '../../domain/config/types';

// §24: the screens of the cossack game under /game. Symfony knows the same list (KozakShellController).
export const KOZAK_BASE = '/game';

// §3.2: the modes of the fights, in the order the game offers them.
export const MODES: readonly Mode[] = ['target', 'random-opponent', 'opponent-levels', 'ladder'];

export function isMode(value: string | undefined): value is Mode {
  return MODES.some((mode) => mode === value);
}

export const kozakPaths = {
  cossack: '/',
  ranks: '/ranks',
  history: '/history',
  settings: '/settings',
  fight: '/fight',
  fightSetup: (mode: Mode) => `/fight/setup/${mode}`,
  fightBattle: '/fight/battle',
  fightResult: (id: string) => `/fight/result/${id}`,
  journey: '/journey',
  campaign: (campaign: string) => `/journey/${campaign}`,
  stage: (campaign: string, stage: number) => `/journey/${campaign}/${stage}`,
  // The id of a level is its address: forest-ravens/1/2.
  level: (id: string) => `/journey/${id}`,
  battle: '/journey/battle',
  outcome: (id: string) => `/journey/result/${id}`,
};
