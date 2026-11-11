// §24.2: glory raises the rank of the cossack, from a dzhura (an apprentice) up to the hetman.
export const RANKS = [
  { id: 'dzhura', glory: 0 },
  { id: 'zastavnyi', glory: 10 },
  { id: 'roiovyi', glory: 25 },
  { id: 'kozak', glory: 45 },
  { id: 'znachkovyi', glory: 70 },
  { id: 'vistun', glory: 100 },
  { id: 'chotar', glory: 140 },
  { id: 'pidkhorunzhyi', glory: 190 },
  { id: 'khorunzhyi', glory: 250 },
  { id: 'sotnyk', glory: 330 },
  { id: 'pidosavul', glory: 430 },
  { id: 'osavul', glory: 550 },
  { id: 'viiskovyi-starshyna', glory: 700 },
  { id: 'polkovnyk', glory: 900 },
  { id: 'heneral-osavul', glory: 1150 },
  { id: 'heneral-khorunzhyi', glory: 1450 },
  { id: 'heneral-polkovnyk', glory: 1800 },
  { id: 'heneral', glory: 2250 },
  { id: 'marshal', glory: 2800 },
  { id: 'hetman', glory: 3500 },
] as const;

export type Rank = (typeof RANKS)[number];
export type RankId = Rank['id'];

// The looks of the cossack: the outfit grows richer with the rank (§24.2).
export type Look = 'recruit' | 'cossack' | 'officer' | 'general' | 'hetman';

// Each look starts at its rank and lasts until the next look.
const LOOKS: readonly (readonly [RankId, Look])[] = [
  ['dzhura', 'recruit'],
  ['kozak', 'cossack'],
  ['sotnyk', 'officer'],
  ['heneral-osavul', 'general'],
  ['hetman', 'hetman'],
];

export interface Standing {
  readonly glory: number;
  readonly rank: Rank;
  // From 1 for a dzhura to 20 for the hetman.
  readonly number: number;
  // null for the hetman: there is nowhere higher.
  readonly next: Rank | null;
  readonly look: Look;
}

export function standingOf(glory: number): Standing {
  const earned = Math.max(0, glory);
  const index = RANKS.findLastIndex((rank) => rank.glory <= earned);
  const rank = RANKS[index] as Rank;

  return {
    glory: earned,
    rank,
    number: index + 1,
    next: RANKS[index + 1] ?? null,
    look: lookOf(rank.id),
  };
}

// The ranks of one look, with their numbers from 1 to 20.
export interface RankGroup {
  readonly look: Look;
  readonly first: number;
  readonly last: number;
  readonly ranks: readonly Rank[];
}

export function rankGroups(): RankGroup[] {
  return RANKS.reduce<RankGroup[]>((groups, rank, index) => {
    const look = lookOf(rank.id);
    const group = groups.at(-1);

    return group?.look === look
      ? [...groups.slice(0, -1), { ...group, last: index + 1, ranks: [...group.ranks, rank] }]
      : [...groups, { look, first: index + 1, last: index + 1, ranks: [rank] }];
  }, []);
}

export function lookOf(id: RankId): Look {
  const index = RANKS.findIndex((rank) => rank.id === id);
  const found = LOOKS.findLast(([from]) => RANKS.findIndex((rank) => rank.id === from) <= index);

  return (found as readonly [RankId, Look])[1];
}
