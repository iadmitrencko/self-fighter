import type { Attempt } from '../history/attempt';
import type { Outcome } from '../results/results';
import { laterFullAt, type EnergyPool } from './energy';

export interface Tally {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}

/**
 * Everything the game knows about the player, derived from the attempts of the game: the
 * history stays the only source, so the numbers always agree with it (§14.2, §24.3).
 */
export interface GameRecord {
  // The fights of the game (§24.6).
  readonly fights: Tally;
  // The levels of the journey: won, or left in the middle.
  readonly campaign: Tally;
  // The levels won at least once, by id in alphabetical order.
  readonly passed: readonly string[];
  // When each pool of energy is full again, by the newest battle that took from it.
  readonly energy: Readonly<Record<EnergyPool, string | null>>;
}

const NO_TALLY: Tally = { wins: 0, draws: 0, losses: 0 };

const TALLIES: Readonly<Record<Outcome, keyof Tally>> = { win: 'wins', draw: 'draws', loss: 'losses' };

export const EMPTY_RECORD: GameRecord = {
  fights: NO_TALLY,
  campaign: NO_TALLY,
  passed: [],
  energy: { fight: null, campaign: null },
};

// Attempts of the site's workouts have no game and stay out of it.
export function computeGameRecord(attempts: readonly Attempt[]): GameRecord {
  return attempts.reduce<GameRecord>((record, attempt) => {
    const { game, result } = attempt;

    if (game === null) {
      return record;
    }
    const tally: Tally = { ...NO_TALLY, [TALLIES[result.outcome]]: 1 };

    return addGameRecords(record, {
      fights: game.pool === 'fight' ? tally : NO_TALLY,
      campaign: game.pool === 'campaign' ? tally : NO_TALLY,
      passed: attempt.mode === 'campaign' && result.outcome === 'win' ? [attempt.config.level] : [],
      energy: { ...EMPTY_RECORD.energy, [game.pool]: game.energyFullAt },
    });
  }, EMPTY_RECORD);
}

// A level passed on the server and again in an attempt that waits for it counts once.
export function addGameRecords(a: GameRecord, b: GameRecord): GameRecord {
  const add = (x: Tally, y: Tally): Tally => ({
    wins: x.wins + y.wins,
    draws: x.draws + y.draws,
    losses: x.losses + y.losses,
  });

  return {
    fights: add(a.fights, b.fights),
    campaign: add(a.campaign, b.campaign),
    passed: [...new Set([...a.passed, ...b.passed])].sort(),
    energy: {
      fight: laterFullAt(a.energy.fight, b.energy.fight),
      campaign: laterFullAt(a.energy.campaign, b.energy.campaign),
    },
  };
}

// Every battle of the game counts, in fights and in the journey alike (§24.6).
export function totalTally({ fights, campaign }: GameRecord): Tally {
  return {
    wins: fights.wins + campaign.wins,
    draws: fights.draws + campaign.draws,
    losses: fights.losses + campaign.losses,
  };
}
