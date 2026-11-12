import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { levelConfig } from '../kozak/battle';
import { findLevel, SICH, type LevelDefinition } from '../kozak/journey';
import {
  deepFreeze,
  fightConfig,
  fightConfigArbitrary,
  legacyLadderAttempt,
  legacyTargetAttempt,
  play,
  pullUps,
  STARTED_AT,
  testDeps,
} from '../testing/fixtures';
import { finalize, isLegacy } from './attempt';

const FINISHED_AT = new Date(STARTED_AT.getTime() + 18 * 60_000 + 24_000);

describe('finalize', () => {
  it('builds a record of a fight for the history', () => {
    const session = play(createSession(fightConfig(), testDeps()));

    const attempt = finalize(session, FINISHED_AT);

    expect(attempt).toMatchObject({
      schemaVersion: 4,
      id: session.id,
      challenge: null,
      game: null,
      mode: 'fight',
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:18:24.000Z',
      durationMs: 1_104_000,
      config: session.config,
    });
    expect(attempt.result.outcome).toBe('win');
  });

  it('builds a record of a level of the journey', () => {
    const level = findLevel(SICH, 'forest-ravens/1/1') as LevelDefinition;
    const attempt = finalize(play(createSession(levelConfig(level, pullUps), testDeps())), FINISHED_AT);

    expect(attempt).toMatchObject({ mode: 'campaign', config: { level: 'forest-ravens/1/1' } });
    expect(attempt.result).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 1, done: true },
        { target: 1, done: true },
      ],
      outcome: 'win',
    });
  });

  it('rejects an unfinished battle', () => {
    expect(() => finalize(createSession(fightConfig(), testDeps()), FINISHED_AT)).toThrow('is not finished');
  });

  it('does not report a negative duration when the clock moved backwards', () => {
    const session = play(createSession(fightConfig(), testDeps()));

    expect(finalize(session, new Date(STARTED_AT.getTime() - 5000)).durationMs).toBe(0);
  });

  it('gives a repeated call the same identity and result', () => {
    const session = play(createSession(fightConfig(), testDeps()));

    expect(finalize(session, FINISHED_AT)).toEqual(finalize(session, FINISHED_AT));
  });

  it('produces a self-contained JSON document without touching the session', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, (config) => {
        const session = deepFreeze(play(createSession(config, testDeps())));
        const attempt = finalize(session, FINISHED_AT);

        expect(JSON.parse(JSON.stringify(attempt))).toEqual(attempt);
      }),
    );
  });
});

// §24.6: the history keeps the attempts of the old modes of the site and tells them apart.
describe('an attempt of an old mode', () => {
  it('is told apart from a battle of the game', () => {
    expect(isLegacy(legacyTargetAttempt('draw'))).toBe(true);
    expect(isLegacy(legacyLadderAttempt('win'))).toBe(true);
    expect(isLegacy(finalize(play(createSession(fightConfig(), testDeps())), FINISHED_AT))).toBe(false);
  });
});
