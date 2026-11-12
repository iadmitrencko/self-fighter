// §24: the screens of the cossack game under /game. Symfony knows the same list (KozakShellController).
export const KOZAK_BASE = '/game';

export const kozakPaths = {
  cossack: '/',
  ranks: '/ranks',
  history: '/history',
  settings: '/settings',
  fight: '/fight',
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
