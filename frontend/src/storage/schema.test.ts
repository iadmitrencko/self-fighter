import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EXERCISE_NAME_MAX, EXERCISES_MAX, LADDER_MAX, REPS_MAX, ROUNDS_MAX } from '../domain/config/limits';
import type { WorkoutConfig } from '../domain/config/types';
import { createSession } from '../domain/engine/session';
import { finalize } from '../domain/history/attempt';
import {
  cycleOffsets,
  ladderConfig,
  offsetsArbitrary,
  play,
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
    ['an unknown format version', { schemaVersion: 2 }],
    ['an id the browser did not create', { id: 'attempt-1' }],
    ['a time with an offset', { finishedAt: '2026-11-02T12:00:00.000+02:00' }],
    ['the mode of another configuration', { mode: 'ladder' }],
  ])('refuses an attempt with %s', (_, change) => {
    const attempt = attemptOf(targetConfig(), () => 11);

    expect(check(null, { ...attempt, ...change })).not.toBeNull();
  });
});
