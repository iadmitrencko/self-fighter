import { describe, expect, it } from 'vitest';
import {
  createSession,
  isCampaignSession,
  isWorkoutSession,
  nextStageIndex,
  submitResult,
} from '../engine/session';
import { finalize } from '../history/attempt';
import { deepFreeze, ladderConfig, pullUps, STARTED_AT, targetConfig, testDeps } from '../testing/fixtures';
import { completeSet, enterBattle, levelConfig, retreat } from './battle';
import { findLevel, SICH, type LevelDefinition } from './journey';

const level = findLevel(SICH, 'forest-ravens/2/3') as LevelDefinition;
const start = () => createSession(levelConfig(level, pullUps), testDeps());

describe('a level of the journey', () => {
  it('fixes its level, exercise and sets', () => {
    expect(levelConfig(level, { ...pullUps, extra: true } as typeof pullUps)).toEqual({
      mode: 'campaign',
      level: 'forest-ravens/2/3',
      exercise: pullUps,
      sets: [1, 2, 3],
    });
  });

  // §24.5: one stage per set, done once all its repetitions are.
  it('plays set by set', () => {
    const session = deepFreeze(start());

    expect(session).toMatchObject({ mode: 'campaign', schemaVersion: 3, challenge: null, game: null });
    expect(session.stages).toEqual([
      { target: 1, rule: 'meet', actual: null },
      { target: 2, rule: 'meet', actual: null },
      { target: 3, rule: 'meet', actual: null },
    ]);

    const done = completeSet(completeSet(completeSet(session)));

    expect(nextStageIndex(done)).toBeNull();
    expect(completeSet(done)).toBe(done);
    expect(finalize(done, STARTED_AT).result).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: true },
        { target: 3, done: true },
      ],
      outcome: 'win',
    });
  });

  // §24.5: leaving in the middle loses the level, and the sets after it are never asked.
  it('is lost when the player retreats', () => {
    const left = retreat(completeSet(start()));

    expect(nextStageIndex(left)).toBeNull();
    expect(retreat(left)).toBe(left);
    expect(finalize(left, STARTED_AT).result).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: false },
        { target: 3, done: false },
      ],
      outcome: 'loss',
    });
  });

  it('ends early when a set falls short', () => {
    expect(nextStageIndex(submitResult(start(), 0, 0))).toBeNull();
  });

  // §24.6: a fight left in the middle gives the rounds ahead to the opponent.
  it('loses what is left of a fight', () => {
    const fight = submitResult(createSession(targetConfig(), testDeps()), 0, 99);
    const left = retreat(fight);

    expect(nextStageIndex(left)).toBeNull();
    expect(left.stages.map(({ actual }) => actual)).toEqual([99, 0, 0, 0]);
    expect(finalize(left, STARTED_AT).result).toMatchObject({ won: 0, lost: 1, drawn: 1, outcome: 'loss' });
  });

  it('is told apart from a workout', () => {
    expect(isCampaignSession(start())).toBe(true);
    expect(isWorkoutSession(start())).toBe(false);
    expect(isWorkoutSession(createSession(ladderConfig(), testDeps()))).toBe(true);
  });
});

describe('entering a battle', () => {
  // §24.4: the battle takes a unit of its pool at its start and keeps the new state of the pool.
  it('marks the session with its pool of energy', () => {
    const fight = enterBattle(createSession(targetConfig(), testDeps()), 'fight', null);

    expect(fight?.game).toEqual({ pool: 'fight', energyFullAt: '2026-10-30T12:00:00.000Z' });
    expect(enterBattle(start(), 'campaign', '2026-10-30T11:00:00.000Z')?.game).toEqual({
      pool: 'campaign',
      energyFullAt: '2026-10-30T16:00:00.000Z',
    });
  });

  it('is refused with no energy left', () => {
    expect(enterBattle(start(), 'campaign', '2026-10-31T11:00:00.000Z')).toBeNull();
  });
});
