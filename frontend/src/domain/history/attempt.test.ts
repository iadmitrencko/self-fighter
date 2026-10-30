import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSession, submitResult } from '../engine/session';
import {
  cycleOffsets,
  deepFreeze,
  ladderConfig,
  offsetsArbitrary,
  opponentLevelsConfig,
  play,
  pullUps,
  randomOpponentConfig,
  seededRng,
  STARTED_AT,
  targetConfig,
  testDeps,
  workoutConfigArbitrary,
} from '../testing/fixtures';
import { finalize } from './attempt';

const FINISHED_AT = new Date(STARTED_AT.getTime() + 18 * 60_000 + 24_000);

describe('finalize', () => {
  it('builds a record for the history', () => {
    const session = play(createSession(targetConfig(), testDeps()), () => 99);

    const attempt = finalize(session, FINISHED_AT);

    expect(attempt).toMatchObject({
      schemaVersion: 1,
      id: session.id,
      mode: 'target',
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:18:24.000Z',
      durationMs: 1_104_000,
      config: session.config,
    });
    expect(attempt.result.outcome).toBe('win');
  });

  it.each([
    ['random-opponent', randomOpponentConfig()],
    ['opponent-levels', opponentLevelsConfig()],
  ] as const)('keeps the opponent results of %s', (mode, config) => {
    const session = play(createSession(config, testDeps()), () => 0);
    const attempt = finalize(session, FINISHED_AT);

    expect(attempt.mode).toBe(mode);
    expect(attempt.result.rounds.flatMap((round) => round.exercises.map((e) => e.target))).toEqual(
      session.stages.map(({ target }) => target),
    );
    expect(attempt.result.outcome).toBe('loss');
  });

  it('keeps the ladder result', () => {
    const session = play(createSession(ladderConfig({ rule: 'meet' }), testDeps()), () => 100);

    expect(finalize(session, FINISHED_AT)).toMatchObject({
      mode: 'ladder',
      config: { exercise: pullUps, max: 5, returnDown: true },
      result: { outcome: 'win', maxPassed: 5, passedCount: 9 },
    });
  });

  it('accepts a ladder that ended early', () => {
    const session = submitResult(createSession(ladderConfig(), testDeps()), 0, 0);

    expect(finalize(session, FINISHED_AT).result.outcome).toBe('loss');
  });

  // §12.4: an unfinished attempt must not reach the history.
  it('rejects an unfinished session', () => {
    const session = submitResult(createSession(targetConfig(), testDeps()), 0, 11);

    expect(() => finalize(session, FINISHED_AT)).toThrow('is not finished');
  });

  it('does not report a negative duration when the clock moved backwards', () => {
    const session = play(createSession(targetConfig(), testDeps()), () => 0);

    expect(finalize(session, new Date(STARTED_AT.getTime() - 5000)).durationMs).toBe(0);
  });

  // §17.2: storing the attempt twice writes to the same key.
  it('gives a repeated call the same identity and result', () => {
    const session = play(createSession(targetConfig(), testDeps()), () => 11);

    expect(finalize(session, FINISHED_AT)).toEqual(finalize(session, FINISHED_AT));
  });

  // Section 3.7 of the plan: the same JSON lives in IndexedDB and in MySQL.
  it('produces a self-contained JSON document without touching the session', () => {
    fc.assert(
      fc.property(workoutConfigArbitrary, offsetsArbitrary, (config, offsets) => {
        const session = deepFreeze(play(createSession(config, testDeps()), cycleOffsets(offsets)));
        const attempt = finalize(session, FINISHED_AT);

        expect(JSON.parse(JSON.stringify(attempt))).toEqual(attempt);
      }),
    );
  });
});

describe('repeating an attempt', () => {
  // §13.4: the same settings, new opponent results, the old attempt stays as it was.
  it('rolls new opponent results from the saved configuration', () => {
    const deps = testDeps({ rng: seededRng(5) });
    const config = randomOpponentConfig({ rounds: 20 });
    const attempt = deepFreeze(finalize(play(createSession(config, deps), () => 0), FINISHED_AT));

    const repeated = createSession(attempt.config, deps);

    expect(repeated.id).not.toBe(attempt.id);
    expect(repeated.config).toEqual(attempt.config);
    expect(repeated.stages.every(({ actual }) => actual === null)).toBe(true);
    expect(repeated.stages.map(({ target }) => target)).not.toEqual(
      attempt.result.rounds.flatMap((round) => round.exercises.map(({ target }) => target)),
    );
  });

  // §5.3: the attempt carries its own names, so the catalog can change or lose the exercise.
  it('needs nothing but the attempt after a custom exercise is deleted', () => {
    const custom = { id: 'custom-1', name: 'Бурпі' };
    const config = targetConfig({ exercises: [{ ...custom, targets: [5, 5] }] });
    const attempt = finalize(play(createSession(config, testDeps()), () => 6), FINISHED_AT);

    const repeated = createSession(attempt.config, testDeps());

    expect(attempt.result.rounds[0]?.exercises[0]?.exercise).toEqual(custom);
    expect(repeated.stages[0]?.exercise).toEqual(custom);
  });
});
