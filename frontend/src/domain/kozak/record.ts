import type { Attempt } from '../history/attempt';
import type { Outcome, SetResult } from '../results/results';
import { addDuelDone, donePlaces, type DuelDone } from './duel';
import { laterFullAt, type EnergyPool } from './energy';
import type { CampaignId, JourneyDefinition } from './journey';

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
  // §24.8: the most repetitions done in one set of a level or of the duel, by the exercise.
  readonly best: Readonly<Record<string, number>>;
  // §24.9: the places of the sets of the duel with the King done, by the round.
  readonly duel: DuelDone;
  // When the latest battle of the duel ended, or null before the first one.
  readonly duelAt: string | null;
}

// §24.8: the record of an exercise of the journey.
export interface BestSet {
  readonly campaign: CampaignId;
  // The ready-made exercise the campaign trains.
  readonly exercise: string;
  // null before the first set of the exercise is done.
  readonly reps: number | null;
}

const NO_TALLY: Tally = { wins: 0, draws: 0, losses: 0 };

const TALLIES: Readonly<Record<Outcome, keyof Tally>> = { win: 'wins', draw: 'draws', loss: 'losses' };

export const EMPTY_RECORD: GameRecord = {
  fights: NO_TALLY,
  campaign: NO_TALLY,
  passed: [],
  energy: { fight: null, campaign: null },
  best: {},
  duel: {},
  duelAt: null,
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
      best: bestOf(attempt),
      duel: attempt.mode === 'duel' ? { [attempt.config.round]: donePlaces(attempt) } : {},
      duelAt: attempt.mode === 'duel' ? attempt.finishedAt : null,
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
    best: Object.fromEntries(
      [...new Set([...Object.keys(a.best), ...Object.keys(b.best)])]
        .sort()
        .map((exercise) => [exercise, Math.max(a.best[exercise] ?? 0, b.best[exercise] ?? 0)]),
    ),
    duel: addDuelDone(a.duel, b.duel),
    duelAt: a.duelAt === null || b.duelAt === null ? (a.duelAt ?? b.duelAt) : a.duelAt > b.duelAt ? a.duelAt : b.duelAt,
  };
}

/**
 * A set counts once it is done, in a battle won or left in the middle alike: a level of the journey
 * trains the exercise of its campaign, a round of the duel all three. Fights stay out (§24.8).
 */
function bestOf(attempt: Attempt): Readonly<Record<string, number>> {
  const sets: readonly (SetResult & { readonly exercise: string })[] =
    attempt.mode === 'campaign'
      ? attempt.result.sets.map((set) => ({ ...set, exercise: attempt.config.exercise.id }))
      : attempt.mode === 'duel'
        ? attempt.result.sets.map((set) => ({ ...set, exercise: set.exercise.id }))
        : [];

  return sets.reduce<Readonly<Record<string, number>>>(
    (best, { exercise, target, done }) => (done && target > (best[exercise] ?? 0) ? { ...best, [exercise]: target } : best),
    {},
  );
}

// §24.8: one record for every exercise the campaigns of the journey train, in their order.
export function bestSets(journey: JourneyDefinition, { best }: GameRecord): BestSet[] {
  return journey.campaigns.flatMap(({ id, exercise }) => (exercise === null ? [] : [{ campaign: id, exercise, reps: best[exercise] ?? null }]));
}

// Every battle of the game counts, in fights and in the journey alike (§24.6).
export function totalTally({ fights, campaign }: GameRecord): Tally {
  return {
    wins: fights.wins + campaign.wins,
    draws: fights.draws + campaign.draws,
    losses: fights.losses + campaign.losses,
  };
}
