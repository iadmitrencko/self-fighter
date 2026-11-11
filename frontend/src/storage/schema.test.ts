import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EXERCISE_NAME_MAX, EXERCISES_MAX, LADDER_MAX, REPS_MAX, ROUNDS_MAX } from '../domain/config/limits';
import type { WorkoutConfig } from '../domain/config/types';
import { createSession } from '../domain/engine/session';
import { finalize } from '../domain/history/attempt';
import { completeSet, enterBattle, levelConfig, retreat } from '../domain/kozak/battle';
import { allLevels, SICH } from '../domain/kozak/journey';
import {
  cycleOffsets,
  ladderConfig,
  offsetsArbitrary,
  play,
  pullUps,
  STARTED_AT,
  targetConfig,
  testDeps,
  workoutConfigArbitrary,
} from '../domain/testing/fixtures';
import { newId } from './ids';

// The server checks every attempt and configuration against this file. When the domain changes
// the format, these tests fail until the schema gets a new version (section 3.7 of the plan).
const SCHEMA_ID = 'attempt';
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
// Vitest runs in frontend/, and Docker Compose mounts the schema next to it.
ajv.addSchema(
  JSON.parse(readFileSync(resolve('../backend/schema/attempt.schema.json'), 'utf8')) as object,
  SCHEMA_ID,
);

const FINISHED_AT = new Date(STARTED_AT.getTime() + 600_000);

function check(definition: string | null, value: unknown): string | null {
  const validate = ajv.getSchema(definition === null ? SCHEMA_ID : `${SCHEMA_ID}#/definitions/${definition}`);

  if (validate === undefined) {
    throw new Error(`The schema has no definition ${definition}`);
  }

  return validate(JSON.parse(JSON.stringify(value))) ? null : ajv.errorsText(validate.errors);
}

function attemptOf(config: WorkoutConfig, reps: Parameters<typeof play>[1]) {
  return finalize(play(createSession(config, testDeps({ newId: () => newId() })), reps), FINISHED_AT);
}

const CONFIG_DEFINITIONS = {
  target: 'targetConfig',
  'random-opponent': 'randomOpponentConfig',
  'opponent-levels': 'opponentLevelsConfig',
  ladder: 'ladderConfig',
} as const;

describe('the format of attempts', () => {
  it('accepts every attempt the game can finish', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, offsetsArbitrary, (config, offsets) => {
        expect(check(null, attemptOf(config, cycleOffsets(offsets)))).toBeNull();
      }),
    );
  });

  it('accepts every configuration as the settings of its mode', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, (config) => {
        expect(check(CONFIG_DEFINITIONS[config.mode], config)).toBeNull();
      }),
    );
  });

  it('accepts the largest workouts', () => {
    const exercises = Array.from({ length: EXERCISES_MAX }, (_, index) => ({
      id: newId(),
      name: `${index}`.padStart(EXERCISE_NAME_MAX, 'ж'),
      targets: Array.from({ length: ROUNDS_MAX }, () => REPS_MAX),
    }));

    expect(check(null, attemptOf(targetConfig({ rounds: ROUNDS_MAX, exercises }), () => REPS_MAX))).toBeNull();
    expect(check(null, attemptOf(ladderConfig({ max: LADDER_MAX, rule: 'meet' }), (stage) => stage.target))).toBeNull();
  });

  it.each([
    ['an unknown field', { rating: 5 }],
    ['an unknown format version', { schemaVersion: 4 }],
    ['the version 1 the API no longer takes', { schemaVersion: 1, game: undefined }],
    ['no challenge', { challenge: undefined }],
    ['no game in version 3', { game: undefined }],
    ['a game in version 2', { schemaVersion: 2, game: { pool: 'fight', energyFullAt: '2026-11-02T12:00:00.000Z' } }],
    ['a fight that took the energy of the journey', { game: { pool: 'campaign', energyFullAt: '2026-11-02T12:00:00.000Z' } }],
    ['a challenge without a title', { challenge: { slug: '100-push-ups', title: '' } }],
    ['a challenge with a strange address', { challenge: { slug: '100 Push-Ups', title: '100 віджимань' } }],
    ['an id the browser did not create', { id: 'attempt-1' }],
    ['a time with an offset', { finishedAt: '2026-11-02T12:00:00.000+02:00' }],
    ['the mode of another configuration', { mode: 'ladder' }],
  ])('refuses an attempt with %s', (_, change) => {
    const attempt = { ...attemptOf(targetConfig(), () => 11), challenge: { slug: '100-push-ups', title: '100 віджимань' } };

    expect(check(null, { ...attempt, ...change })).not.toBeNull();
  });

  // §21.3: version 2 names the ready-made challenge of the attempt, or null.
  it('accepts an attempt that took a challenge', () => {
    const challenge = { slug: 'pull-ups-ladder-to-3', title: 'Драбина підтягувань до 3' };
    const attempt = finalize(
      play(createSession(ladderConfig({ max: 3 }), testDeps({ newId: () => newId() }), challenge), () => 9),
      FINISHED_AT,
    );

    expect(check(null, attempt)).toBeNull();
  });

  // Section 3.7 of the plan: a tab opened before the release still sends version 2.
  it('still accepts an attempt of version 2', () => {
    const attempt: Record<string, unknown> = { ...attemptOf(targetConfig(), () => 11), schemaVersion: 2 };
    delete attempt.game;

    expect(check(null, attempt)).toBeNull();
  });

  // §24.4: a fight of the game names the pool of energy it took.
  it('accepts a fight of the game', () => {
    const session = enterBattle(createSession(targetConfig(), testDeps({ newId: () => newId() })), 'fight', null);

    expect(session).not.toBeNull();
    expect(check(null, finalize(play(session ?? (undefined as never), () => 11), FINISHED_AT))).toBeNull();
  });

  // §24.5: every level of the journey, won or left in the middle.
  it.each(allLevels(SICH).map((level) => [level.id, level] as const))('accepts the level %s', (_, level) => {
    const start = enterBattle(createSession(levelConfig(level, pullUps), testDeps({ newId: () => newId() })), 'campaign', null);
    const won = play(start ?? (undefined as never), (stage) => stage.target);
    const left = retreat(completeSet(start ?? (undefined as never)));

    expect(check(null, finalize(won, FINISHED_AT))).toBeNull();
    expect(check(null, finalize(left, FINISHED_AT))).toBeNull();
  });

  it.each([
    ['no game', { game: null }],
    ['the energy of fights', { game: { pool: 'fight', energyFullAt: '2026-11-02T12:00:00.000Z' } }],
    ['a challenge', { challenge: { slug: '100-pull-ups', title: '100 підтягувань' } }],
    ['version 2', { schemaVersion: 2 }],
    ['a draw', { result: { sets: [{ target: 1, done: true }], outcome: 'draw' } }],
  ])('refuses a level of the journey with %s', (_, change) => {
    const level = allLevels(SICH)[0];
    const start = enterBattle(createSession(levelConfig(level ?? (undefined as never), pullUps), testDeps({ newId: () => newId() })), 'campaign', null);
    const attempt = finalize(play(start ?? (undefined as never), (stage) => stage.target), FINISHED_AT);

    expect(check(null, { ...attempt, ...change })).not.toBeNull();
  });
});
