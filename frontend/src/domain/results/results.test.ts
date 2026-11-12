import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { retreat } from '../kozak/battle';
import { fightConfig, fightConfigArbitrary, play, pushUps, squats, testDeps } from '../testing/fixtures';
import { computeCampaignResult, computeFightResult } from './results';

describe('computeFightResult', () => {
  // §6: every set done is a win.
  it('wins when every set is done', () => {
    const session = play(createSession(fightConfig(), testDeps()));

    expect(computeFightResult(session.config, session.stages)).toEqual({
      exercises: [
        {
          exercise: pushUps,
          sets: [
            { target: 10, done: true },
            { target: 12, done: true },
            { target: 10, done: true },
          ],
        },
        {
          exercise: squats,
          sets: [
            { target: 15, done: true },
            { target: 15, done: true },
            { target: 20, done: true },
          ],
        },
      ],
      outcome: 'win',
    });
  });

  // §6: a single set not done loses the fight, the last one too.
  it('loses when any set is not done', () => {
    const session = play(createSession(fightConfig(), testDeps()), 5);
    const result = computeFightResult(session.config, session.stages);

    expect(result.outcome).toBe('loss');
    expect(result.exercises.map(({ sets }) => sets.map(({ done }) => done))).toEqual([
      [true, true, true],
      [true, true, false],
    ]);
  });

  it('counts a retreat before the first set as nothing done', () => {
    const session = retreat(createSession(fightConfig(), testDeps()));
    const result = computeFightResult(session.config, session.stages);

    expect(result.outcome).toBe('loss');
    expect(result.exercises.flatMap(({ sets }) => sets).some(({ done }) => done)).toBe(false);
  });

  it('keeps every exercise and every round of any fight', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, fc.boolean(), (config, win) => {
        const session = createSession(config, testDeps());
        const played = play(session, win ? null : session.stages.length - 1);
        const result = computeFightResult(played.config, played.stages);

        expect(result.exercises.map(({ exercise }) => exercise.id)).toEqual(config.exercises.map(({ id }) => id));
        expect(result.exercises.map(({ sets }) => sets.map(({ target }) => target))).toEqual(config.exercises.map(({ sets }) => sets));
        expect(result.outcome).toBe(win ? 'win' : 'loss');
      }),
    );
  });
});

describe('computeCampaignResult', () => {
  it('wins when every set is done', () => {
    expect(
      computeCampaignResult([
        { target: 1, done: true },
        { target: 2, done: true },
      ]),
    ).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: true },
      ],
      outcome: 'win',
    });
  });

  it('loses a set that waits as well as a set not done', () => {
    expect(
      computeCampaignResult([
        { target: 1, done: true },
        { target: 2, done: false },
        { target: 3, done: null },
      ]),
    ).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: false },
        { target: 3, done: false },
      ],
      outcome: 'loss',
    });
  });
});
