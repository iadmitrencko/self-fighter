import type { Attempt } from '../history/attempt';
import type { Outcome } from '../results/results';
import { lastDays, localDate } from './calendar';
import { addDuelDone, donePlaces, type DuelDone } from './duel';
import { laterFullAt, type EnergyPool } from './energy';

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
  // The levels of the journey: won, or left in the middle.
  readonly campaign: Tally;
  // The levels won at least once, by id in alphabetical order.
  readonly passed: readonly string[];
  // When each pool of energy is full again, by the newest battle that took from it.
  readonly energy: Readonly<Record<EnergyPool, string | null>>;
  // §24.10: every exercise done in the fights and the journey, by its id.
  readonly exercises: Readonly<Record<string, ExerciseTotal>>;
  // §24.12: the days with a battle by the calendar of the player, in order.
  readonly days: readonly string[];
  // §24.10: the repetitions of each exercise by the day, the last seven days at least.
  readonly week: Readonly<Record<string, Readonly<Record<string, number>>>>;
  // §24.9: the places of the sets of the duel with the King done, by the round.
  readonly duel: DuelDone;
  // When the latest battle of the duel ended, or null before the first one.
  readonly duelAt: string | null;
}

const NO_TALLY: Tally = { wins: 0, draws: 0, losses: 0 };

const TALLIES: Readonly<Record<Outcome, keyof Tally>> = { win: 'wins', draw: 'draws', loss: 'losses' };

export const EMPTY_RECORD: GameRecord = {
  fights: NO_TALLY,
  campaign: NO_TALLY,
  passed: [],
  energy: { fight: null, campaign: null },
  exercises: {},
  days: [],
  week: {},
  duel: {},
  duelAt: null,
};

// Every attempt adds to the record, whatever order they come in. Its day goes by the time zone of the player.
export function computeGameRecord(attempts: readonly Attempt[], timeZone: string): GameRecord {
  return attempts.reduce<GameRecord>((record, attempt) => addGameRecords(record, recordOf(attempt, timeZone)), EMPTY_RECORD);
}

// A battle that never started took no energy and counts for nothing.
function recordOf(attempt: Attempt, timeZone: string): GameRecord {
  const { game, result } = attempt;

  if (game === null) {
    return EMPTY_RECORD;
  }
  const tally: Tally = { ...NO_TALLY, [TALLIES[result.outcome]]: 1 };
  const exercises = exercisesOf(attempt);
  const day = localDate(attempt.finishedAt, timeZone);
  const reps = Object.entries(exercises).map(([exercise, { total }]) => [exercise, total] as const);

  return {
    fights: game.pool === 'fight' ? tally : NO_TALLY,
    campaign: game.pool === 'campaign' ? tally : NO_TALLY,
    passed: attempt.mode === 'campaign' && result.outcome === 'win' ? [attempt.config.level] : [],
    energy: { ...EMPTY_RECORD.energy, [game.pool]: game.energyFullAt },
    exercises,
    days: [day],
    week: reps.length === 0 ? {} : { [day]: Object.fromEntries(reps) },
    duel: attempt.mode === 'duel' ? { [attempt.config.round]: donePlaces(attempt) } : {},
    duelAt: attempt.mode === 'duel' ? attempt.finishedAt : null,
  };
}

/**
 * Two records as one, such as the record of the server and that of the attempts waiting in the
 * browser. A level passed in both counts once.
 */
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
    exercises: Object.fromEntries(
      [...new Set([...Object.keys(a.exercises), ...Object.keys(b.exercises)])].sort().map((exercise) => {
        const x = a.exercises[exercise] ?? NO_TOTAL;
        const y = b.exercises[exercise] ?? NO_TOTAL;

        return [exercise, { best: Math.max(x.best, y.best), total: x.total + y.total }];
      }),
    ),
    days: [...new Set([...a.days, ...b.days])].sort(),
    week: Object.fromEntries(
      [...new Set([...Object.keys(a.week), ...Object.keys(b.week)])].sort().map((day) => [day, addReps(a.week[day] ?? {}, b.week[day] ?? {})]),
    ),
    duel: addDuelDone(a.duel, b.duel),
    duelAt: a.duelAt === null || b.duelAt === null ? (a.duelAt ?? b.duelAt) : a.duelAt > b.duelAt ? a.duelAt : b.duelAt,
  };
}

const NO_TOTAL: ExerciseTotal = { best: 0, total: 0 };

function addReps(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  return Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().map((exercise) => [exercise, (a[exercise] ?? 0) + (b[exercise] ?? 0)]),
  );
}

export interface DayReps {
  readonly date: string;
  readonly reps: number;
}

// §24.10: the repetitions of each of the last seven days up to today, the oldest first: of every
// exercise, or of the one given.
export function weekDays({ week }: GameRecord, today: string, exercise: string | null = null): DayReps[] {
  return lastDays(today, 7).map((date) => {
    const day = week[date] ?? {};

    return { date, reps: exercise === null ? Object.values(day).reduce((sum, reps) => sum + reps, 0) : (day[exercise] ?? 0) };
  });
}

// §24.10: the repetitions of each exercise in the last seven days up to today.
export function weekTotals({ week }: GameRecord, today: string): Readonly<Record<string, number>> {
  return lastDays(today, 7).reduce<Readonly<Record<string, number>>>((totals, date) => addReps(totals, week[date] ?? {}), {});
}

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

// Every battle of the game counts, in fights and in the journey alike (§24.6).
export function totalTally({ fights, campaign }: GameRecord): Tally {
  return {
    wins: fights.wins + campaign.wins,
    draws: fights.draws + campaign.draws,
    losses: fights.losses + campaign.losses,
  };
}
