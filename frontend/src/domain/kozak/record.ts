import type { Attempt } from '../history/attempt';
import type { Outcome } from '../results/results';
import { addDuelDone, donePlaces, type DuelDone } from './duel';
import { laterFullAt, type EnergyPool } from './energy';
import type { CampaignId, JourneyDefinition } from './journey';

export interface Tally {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}

// §24.10: what the player has done of one exercise.
export interface ExerciseTotal {
  // The most repetitions done in one set.
  readonly best: number;
  // Every repetition done.
  readonly total: number;
}

/**
 * Everything the game knows about the player, derived from the attempts of the game: the
 * history stays the only source, so the numbers always agree with it (§14.2, §24.3).
 */
export interface GameRecord {
  // The fights of the game (§24.6).
  readonly fights: Tally;
  // §24.7: the fights won one after another since the last one that was not.
  readonly fightStreak: number;
  // The levels of the journey: won, or left in the middle.
  readonly campaign: Tally;
  // The levels won at least once, by id in alphabetical order.
  readonly passed: readonly string[];
  // When each pool of energy is full again, by the newest battle that took from it.
  readonly energy: Readonly<Record<EnergyPool, string | null>>;
  // §24.8: the most repetitions done in one set of a level or of the duel, by the exercise.
  readonly best: Readonly<Record<string, number>>;
  // §24.10: every exercise done in the fights and the journey, by its id.
  readonly exercises: Readonly<Record<string, ExerciseTotal>>;
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
  fightStreak: 0,
  campaign: NO_TALLY,
  passed: [],
  energy: { fight: null, campaign: null },
  best: {},
  exercises: {},
  duel: {},
  duelAt: null,
};

// The attempts count in the order they finished, since a run of won fights depends on it.
export function computeGameRecord(attempts: readonly Attempt[]): GameRecord {
  return [...attempts].sort(finishOrder).reduce<GameRecord>((record, attempt) => addGameRecords(record, recordOf(attempt)), EMPTY_RECORD);
}

// A battle that never started took no energy and counts for nothing.
function recordOf(attempt: Attempt): GameRecord {
  const { game, result } = attempt;

  if (game === null) {
    return EMPTY_RECORD;
  }
  const exercises = exercisesOf(attempt);
  const tally: Tally = { ...NO_TALLY, [TALLIES[result.outcome]]: 1 };
  const fight = game.pool === 'fight';

  return {
    fights: fight ? tally : NO_TALLY,
    fightStreak: fight && result.outcome === 'win' ? 1 : 0,
    campaign: game.pool === 'campaign' ? tally : NO_TALLY,
    passed: attempt.mode === 'campaign' && result.outcome === 'win' ? [attempt.config.level] : [],
    energy: { ...EMPTY_RECORD.energy, [game.pool]: game.energyFullAt },
    // §24.8: a level of the journey trains the exercise of its campaign, a round of the duel all
    // three. Fights stay out of these records: the player puts them together freely.
    best:
      attempt.mode === 'campaign' || attempt.mode === 'duel'
        ? Object.fromEntries(Object.entries(exercises).map(([exercise, { best }]) => [exercise, best]))
        : {},
    exercises,
    duel: attempt.mode === 'duel' ? { [attempt.config.round]: donePlaces(attempt) } : {},
    duelAt: attempt.mode === 'duel' ? attempt.finishedAt : null,
  };
}

/**
 * `b` is the later of the two: the attempts that wait in the browser came after those the server
 * keeps. A level passed in both counts once.
 */
export function addGameRecords(a: GameRecord, b: GameRecord): GameRecord {
  const add = (x: Tally, y: Tally): Tally => ({
    wins: x.wins + y.wins,
    draws: x.draws + y.draws,
    losses: x.losses + y.losses,
  });

  return {
    fights: add(a.fights, b.fights),
    // A fight of the later record that was not won ends the run of the earlier one.
    fightStreak: b.fights.draws + b.fights.losses === 0 ? a.fightStreak + b.fightStreak : b.fightStreak,
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
    exercises: Object.fromEntries(
      [...new Set([...Object.keys(a.exercises), ...Object.keys(b.exercises)])].sort().map((exercise) => {
        const x = a.exercises[exercise] ?? NO_TOTAL;
        const y = b.exercises[exercise] ?? NO_TOTAL;

        return [exercise, { best: Math.max(x.best, y.best), total: x.total + y.total }];
      }),
    ),
    duel: addDuelDone(a.duel, b.duel),
    duelAt: a.duelAt === null || b.duelAt === null ? (a.duelAt ?? b.duelAt) : a.duelAt > b.duelAt ? a.duelAt : b.duelAt,
  };
}

const NO_TOTAL: ExerciseTotal = { best: 0, total: 0 };

// §24.10: the largest set and the sum of the sets done, for every exercise of the attempt.
function exercisesOf(attempt: Attempt): Readonly<Record<string, ExerciseTotal>> {
  return setsDone(attempt).reduce<Readonly<Record<string, ExerciseTotal>>>((totals, [exercise, reps]) => {
    const { best, total } = totals[exercise] ?? NO_TOTAL;

    return { ...totals, [exercise]: { best: Math.max(best, reps), total: total + reps } };
  }, {});
}

// The sets of a battle done, with their exercise: in a battle won or left in the middle alike.
function setsDone(attempt: Attempt): readonly (readonly [exercise: string, reps: number])[] {
  switch (attempt.mode) {
    case 'fight':
      return attempt.result.exercises.flatMap(({ exercise, sets }) =>
        sets.filter(({ done }) => done).map(({ target }) => [exercise.id, target] as const),
      );
    case 'campaign':
      return attempt.result.sets.filter(({ done }) => done).map(({ target }) => [attempt.config.exercise.id, target] as const);
    case 'duel':
      return attempt.result.sets.filter(({ done }) => done).map(({ exercise, target }) => [exercise.id, target] as const);
  }
}

// By the time an attempt finished, then by its id, as the server orders them.
function finishOrder(a: Attempt, b: Attempt): number {
  const order = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);

  return order(a.finishedAt, b.finishedAt) || order(a.id, b.id);
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
