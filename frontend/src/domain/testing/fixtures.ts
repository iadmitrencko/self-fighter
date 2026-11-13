import fc from 'fast-check';
import type { ChallengeRef } from '../catalog/challenge';
import type { ExerciseRef } from '../catalog/exercise';
import { EXERCISES_MAX, ROUNDS_MAX, SET_REPS_MAX, SET_REPS_MIN } from '../config/limits';
import type { FightConfig } from '../config/types';
import {
  createSession,
  nextStageIndex,
  SCHEMA_VERSION,
  type GameMark,
  type Session,
  type SessionDeps,
} from '../engine/session';
import { finalize, type CampaignAttempt, type DuelAttempt, type FightAttempt } from '../history/attempt';
import type { LadderAttempt, RoundsAttempt } from '../history/legacy';
import { completeSet, levelConfig, retreat } from '../kozak/battle';
import { DUEL, duelConfig, duelProgress, type DuelDone } from '../kozak/duel';
import { findLevel, SICH } from '../kozak/journey';
import type { BattleOutcome, Outcome } from '../results/results';

export const pushUps: ExerciseRef = { id: 'push-ups', name: 'Відтискання' };
export const squats: ExerciseRef = { id: 'squats', name: 'Присідання' };
export const pullUps: ExerciseRef = { id: 'pull-ups', name: 'Підтягування' };

export const STARTED_AT = new Date('2026-10-30T10:00:00.000Z');
const FINISHED_AT = new Date(STARTED_AT.getTime() + 600_000);

export function testDeps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  let created = 0;

  return {
    now: () => STARTED_AT,
    newId: () => {
      created += 1;

      return `attempt-${created}`;
    },
    ...overrides,
  };
}

// Any attempt to change a frozen value throws in strict mode, so it proves a function is pure.
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }

  return value;
}

// Does every set, or retreats when the set `retreatAt` comes (§6, §24.5).
export function play<TSession extends Session>(session: TSession, retreatAt: number | null = null): TSession {
  let current = session;

  // Bounded, so a broken engine fails the test instead of hanging it.
  for (let step = 0; step < session.stages.length; step += 1) {
    const index = nextStageIndex(current);

    if (index === null) {
      break;
    }
    current = index === retreatAt ? retreat(current) : completeSet(current);
  }

  return current;
}

// §6: push-ups and squats in three rounds.
export function fightConfig(overrides: Partial<FightConfig> = {}): FightConfig {
  return {
    mode: 'fight',
    exercises: [
      { ...pushUps, sets: [10, 12, 10] },
      { ...squats, sets: [15, 15, 20] },
    ],
    ...overrides,
  };
}

const repsArbitrary = fc.integer({ min: SET_REPS_MIN, max: SET_REPS_MAX });

// Any fight the grid lets the player put together.
export const fightConfigArbitrary: fc.Arbitrary<FightConfig> = fc
  .record({ rounds: fc.integer({ min: 1, max: ROUNDS_MAX }), count: fc.integer({ min: 1, max: EXERCISES_MAX }) })
  .chain(({ rounds, count }) =>
    fc.array(fc.array(repsArbitrary, { minLength: rounds, maxLength: rounds }), { minLength: count, maxLength: count }),
  )
  .map((rows) => ({
    mode: 'fight' as const,
    exercises: rows.map((sets, index) => ({ id: `exercise-${index + 1}`, name: `Вправа ${index + 1}`, sets })),
  }));

export function fightGame(energyFullAt = '2026-10-30T12:00:00.000Z'): GameMark {
  return { pool: 'fight', energyFullAt };
}

// §6: a fight of the game, every set done, or left before its last set.
export function fightAttempt(outcome: BattleOutcome, game: GameMark = fightGame()): FightAttempt {
  const session = createSession(fightConfig(), testDeps());
  const played = play(session, outcome === 'win' ? null : session.stages.length - 1);

  return { ...finalize(played, FINISHED_AT), game };
}

// §24.5: a level of the journey, won or left before its first set.
// A level of the journey; a loss leaves its sets from `retreatAt` on undone.
export function campaignAttempt(
  id: string,
  outcome: BattleOutcome = 'win',
  energyFullAt = '2026-10-30T15:00:00.000Z',
  { exercise = pullUps, retreatAt = 0 }: { readonly exercise?: ExerciseRef; readonly retreatAt?: number } = {},
): CampaignAttempt {
  const level = findLevel(SICH, id);

  if (level === null) {
    throw new Error(`The journey has no level ${id}`);
  }
  const session = createSession(levelConfig(level, exercise), testDeps());
  const played = outcome === 'win' ? play(session) : play(session, retreatAt);

  return { ...finalize(played, FINISHED_AT), game: { pool: 'campaign', energyFullAt } };
}

interface LegacyOptions {
  readonly id?: string;
  readonly finishedAt?: Date;
  readonly game?: GameMark | null;
  readonly challenge?: ChallengeRef | null;
}

function legacyBase({ id = 'legacy-1', finishedAt = FINISHED_AT, game = null, challenge = null }: LegacyOptions) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    startedAt: new Date(finishedAt.getTime() - 600_000).toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: 600_000,
    challenge,
    game,
  };
}

// Push-ups and squats against 10 in one round: a draw wins one exercise and loses the other.
const LEGACY_REPS: Record<Outcome, readonly [number, number]> = { win: [11, 11], draw: [11, 9], loss: [9, 9] };

/**
 * An attempt of «Ціль», a mode of the site before a fight was put together freely (§6). The
 * history keeps such attempts as the server stored them, the draws among them.
 */
export function legacyTargetAttempt(outcome: Outcome, options: LegacyOptions = {}): RoundsAttempt {
  const exercises = [pushUps, squats].map((exercise, index) => {
    const actual = LEGACY_REPS[outcome][index] ?? 0;

    return { exercise, target: 10, actual, outcome: actual > 10 ? ('win' as const) : ('loss' as const) };
  });
  const won = exercises.filter((exercise) => exercise.outcome === 'win').length;
  const lost = exercises.length - won;

  return {
    ...legacyBase(options),
    mode: 'target',
    config: {
      mode: 'target',
      rule: 'over',
      rounds: 1,
      exercises: [
        { ...pushUps, targets: [10] },
        { ...squats, targets: [10] },
      ],
    },
    result: {
      rounds: [{ exercises, won, lost, outcome }],
      won: outcome === 'win' ? 1 : 0,
      drawn: outcome === 'draw' ? 1 : 0,
      lost: outcome === 'loss' ? 1 : 0,
      outcome,
    },
  };
}

// A ladder of one step, the other old mode of the site with a result of its own.
export function legacyLadderAttempt(outcome: BattleOutcome, options: LegacyOptions = {}): LadderAttempt {
  const passed = outcome === 'win';

  return {
    ...legacyBase(options),
    mode: 'ladder',
    config: { mode: 'ladder', rule: 'meet', exercise: pullUps, max: 1, returnDown: false },
    result: {
      stages: [{ target: 1, actual: passed ? 1 : 0, passed }],
      maxPassed: passed ? 1 : 0,
      passedCount: passed ? 1 : 0,
      outcome,
    },
  };
}

/**
 * §24.9: a battle of the duel with the King that goes on with its round after the sets done before,
 * every set done or left at the set `retreatAt`.
 */
export function duelBattle(
  round: number,
  finishedAt: string,
  energyFullAt: string,
  {
    done = {},
    retreatAt = null,
    newId,
  }: { readonly done?: DuelDone; readonly retreatAt?: number | null; readonly newId?: () => string } = {},
): DuelAttempt {
  const progress = duelProgress(DUEL, done, true).rounds[round - 1];
  const config = progress === undefined ? null : duelConfig(progress, [pushUps, squats, pullUps]);

  if (config === null) {
    throw new Error(`The duel has no sets left in round ${round}`);
  }
  const session = createSession(config, testDeps(newId === undefined ? {} : { newId }));

  return { ...finalize(play(session, retreatAt), new Date(finishedAt)), game: { pool: 'campaign', energyFullAt } };
}
