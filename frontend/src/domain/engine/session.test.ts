import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { completeSet, levelConfig, retreat } from '../kozak/battle';
import { findLevel, SICH, type LevelDefinition } from '../kozak/journey';
import {
  deepFreeze,
  fightConfig,
  fightConfigArbitrary,
  pullUps,
  pushUps,
  squats,
  STARTED_AT,
  testDeps,
} from '../testing/fixtures';
import { createSession, isCampaignSession, isFightSession, markSet, nextStageIndex, SCHEMA_VERSION } from './session';

describe('createSession', () => {
  it('fixes the id, the start time and the schema version', () => {
    const session = createSession(fightConfig(), testDeps());

    expect(session).toMatchObject({
      schemaVersion: 5,
      id: 'attempt-1',
      startedAt: STARTED_AT.toISOString(),
      challenge: null,
      game: null,
      mode: 'fight',
    });
    expect(SCHEMA_VERSION).toBe(5);
  });

  // §6: every exercise of the first round, then every one of the second.
  it('turns the grid into sets, round by round', () => {
    const session = createSession(fightConfig(), testDeps());

    expect(session.stages).toEqual([
      { round: 0, exercise: pushUps, target: 10, done: null },
      { round: 0, exercise: squats, target: 15, done: null },
      { round: 1, exercise: pushUps, target: 12, done: null },
      { round: 1, exercise: squats, target: 15, done: null },
      { round: 2, exercise: pushUps, target: 10, done: null },
      { round: 2, exercise: squats, target: 20, done: null },
    ]);
  });

  it('turns a level of the journey into its sets', () => {
    const level = findLevel(SICH, 'forest-ravens/2/3') as LevelDefinition;
    const session = createSession(levelConfig(level, pullUps), testDeps());

    expect(session.stages).toEqual([
      { target: 1, done: null },
      { target: 2, done: null },
      { target: 3, done: null },
    ]);
    expect(isCampaignSession(session)).toBe(true);
    expect(isFightSession(session)).toBe(false);
  });

  // A row shorter than the others leaves out the rounds it does not have.
  it('skips the rounds an exercise does not have', () => {
    const session = createSession(fightConfig({ exercises: [{ ...pushUps, sets: [10, 12] }, { ...squats, sets: [15] }] }), testDeps());

    expect(session.stages.map(({ round, exercise }) => `${round}:${exercise.id}`)).toEqual(['0:push-ups', '0:squats', '1:push-ups']);
  });

  it('does not share the configuration with the caller', () => {
    const config = fightConfig();
    const session = createSession(config, testDeps());

    expect(session.config).toEqual(config);
    expect(session.config).not.toBe(config);
    expect(session.config.exercises[0]).not.toBe(config.exercises[0]);
  });

  it('has a set for every cell of any grid', () => {
    fc.assert(
      fc.property(fightConfigArbitrary, (config) => {
        const session = createSession(config, testDeps());
        const cells = config.exercises.reduce((total, { sets }) => total + sets.length, 0);

        expect(session.stages).toHaveLength(cells);
        expect(session.stages.map(({ round }) => round)).toEqual([...session.stages.map(({ round }) => round)].sort((a, b) => a - b));
      }),
    );
  });
});

describe('the sets of a battle', () => {
  it('go one after another', () => {
    const session = deepFreeze(createSession(fightConfig(), testDeps()));

    expect(nextStageIndex(session)).toBe(0);
    expect(nextStageIndex(markSet(session, true))).toBe(1);
    expect(nextStageIndex(markSet(markSet(session, true), true))).toBe(2);
  });

  it('are over once every set is done', () => {
    let session = createSession(fightConfig(), testDeps());

    for (let set = 0; set < 6; set += 1) {
      session = completeSet(session);
    }

    expect(nextStageIndex(session)).toBeNull();
    expect(session.stages.every(({ done }) => done === true)).toBe(true);
  });

  // §6, §24.5: a set not done ends the battle.
  it('are over at a set not done', () => {
    const session = markSet(completeSet(createSession(fightConfig(), testDeps())), false);

    expect(nextStageIndex(session)).toBeNull();
    expect(session.stages.map(({ done }) => done)).toEqual([true, false, null, null, null, null]);
  });

  // A second tap after the last set records nothing.
  it('stay as they were once the battle is over', () => {
    const over = retreat(createSession(fightConfig(), testDeps()));

    expect(markSet(over, true)).toBe(over);
  });

  it('never change the session they are given', () => {
    const session = deepFreeze(createSession(fightConfig(), testDeps()));

    expect(() => completeSet(session)).not.toThrow();
    expect(() => retreat(session)).not.toThrow();
    expect(session.stages.every(({ done }) => done === null)).toBe(true);
  });
});
