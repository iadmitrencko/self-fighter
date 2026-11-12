import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EXERCISE_NAME_MAX, EXERCISES_MAX, ROUNDS_MAX, SET_REPS_MAX } from '../domain/config/limits';
import type { FightConfig } from '../domain/config/types';
import { createSession } from '../domain/engine/session';
import { finalize } from '../domain/history/attempt';
import { completeSet, enterBattle, levelConfig, retreat } from '../domain/kozak/battle';
import { allLevels, SICH } from '../domain/kozak/journey';
import {
  fightConfig,
  fightConfigArbitrary,
  legacyLadderAttempt,
  legacyTargetAttempt,
  play,
  pullUps,
  STARTED_AT,
  testDeps,
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

// A fight of the game as the player finishes it: every set done, or left before the last one.
function fightOf(config: FightConfig, win = true) {
  const start = enterBattle(createSession(config, testDeps({ newId: () => newId() })), 'fight', null);

  if (start === null) {
    throw new Error('A full pool refuses no fight');
  }

  return finalize(play(start, win ? null : start.stages.length - 1), FINISHED_AT);
}

describe('the format of attempts', () => {
  it('accepts every fight the game can finish', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, fc.boolean(), (config, win) => {
        expect(check(null, fightOf(config, win))).toBeNull();
      }),
    );
  });

  it('accepts every fight as the settings of the player', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, (config) => {
        expect(check('fightConfig', config)).toBeNull();
      }),
    );
  });

  it('accepts the largest fight', () => {
    const exercises = Array.from({ length: EXERCISES_MAX }, (_, index) => ({
      id: newId(),
      name: `${index}`.padStart(EXERCISE_NAME_MAX, 'ж'),
      sets: Array.from({ length: ROUNDS_MAX }, () => SET_REPS_MAX),
    }));

    expect(check(null, fightOf({ mode: 'fight', exercises }))).toBeNull();
  });

  it.each([
    ['an unknown field', { rating: 5 }],
    ['an unknown format version', { schemaVersion: 5 }],
    ['the version 3 that knew no such fight', { schemaVersion: 3 }],
    ['no game', { game: null }],
    ['the energy of the journey', { game: { pool: 'campaign', energyFullAt: '2026-11-02T12:00:00.000Z' } }],
    ['a challenge', { challenge: { slug: '100-push-ups', title: '100 віджимань' } }],
    ['an id the browser did not create', { id: 'attempt-1' }],
    ['a time with an offset', { finishedAt: '2026-11-02T12:00:00.000+02:00' }],
    ['the mode of another configuration', { mode: 'target' }],
    ['a draw', { result: { exercises: [{ exercise: pullUps, sets: [{ target: 1, done: true }] }], outcome: 'draw' } }],
  ])('refuses a fight with %s', (_, change) => {
    expect(check(null, { ...fightOf(fightConfig()), ...change })).not.toBeNull();
  });

  it.each([
    ['no repetitions', { exercises: [{ ...pullUps, sets: [0] }] }],
    ['more repetitions than a set takes', { exercises: [{ ...pullUps, sets: [SET_REPS_MAX + 1] }] }],
    ['more rounds than a fight takes', { exercises: [{ ...pullUps, sets: Array.from({ length: ROUNDS_MAX + 1 }, () => 1) }] }],
    ['no exercise', { exercises: [] }],
  ])('refuses the settings of a fight with %s', (_, change) => {
    expect(check('fightConfig', { ...fightConfig(), ...change })).not.toBeNull();
  });

  // §24.5: every level of the journey, won or left in the middle.
  it.each(allLevels(SICH).map((level) => [level.id, level] as const))('accepts the level %s', (_, level) => {
    const start = enterBattle(createSession(levelConfig(level, pullUps), testDeps({ newId: () => newId() })), 'campaign', null);
    const won = play(start ?? (undefined as never));
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
    const attempt = finalize(play(start ?? (undefined as never)), FINISHED_AT);

    expect(check(null, { ...attempt, ...change })).not.toBeNull();
  });
});

// §24.6: the history keeps the attempts of the old modes, and a tab opened before §6 still sends them.
describe('the attempts of the old modes', () => {
  const challenge = { slug: 'pull-ups-ladder-to-3', title: 'Драбина підтягувань до 3' };
  const game = { pool: 'fight', energyFullAt: '2026-11-02T12:00:00.000Z' };

  it.each([
    ['«Ціль» of the site', legacyTargetAttempt('draw', { id: newId() })],
    ['a ladder of the site', legacyLadderAttempt('win', { id: newId() })],
    ['a fight of the game in «Ціль»', { ...legacyTargetAttempt('loss', { id: newId() }), game }],
    ['an attempt that took a challenge', legacyLadderAttempt('loss', { id: newId(), challenge })],
    ['version 3', { ...legacyTargetAttempt('win', { id: newId() }), schemaVersion: 3 }],
  ])('stay readable: %s', (_, attempt) => {
    expect(check(null, attempt)).toBeNull();
  });

  // Section 3.7 of the plan: version 2 knew no game.
  it('still take version 2', () => {
    const attempt: Record<string, unknown> = { ...legacyTargetAttempt('win', { id: newId() }), schemaVersion: 2 };
    delete attempt.game;

    expect(check(null, attempt)).toBeNull();
  });

  it.each([
    ['version 1 the API no longer takes', { schemaVersion: 1, game: undefined }],
    ['no game in version 3', { schemaVersion: 3, game: undefined }],
    ['a game in version 2', { schemaVersion: 2, game }],
    ['a fight of the old modes that took the energy of the journey', { game: { pool: 'campaign', energyFullAt: '2026-11-02T12:00:00.000Z' } }],
    ['a challenge with a strange address', { challenge: { slug: '100 Push-Ups', title: '100 віджимань' } }],
  ])('refuse %s', (_, change) => {
    expect(check(null, { ...legacyTargetAttempt('win', { id: newId() }), ...change })).not.toBeNull();
  });
});
