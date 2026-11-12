import { describe, expect, it } from 'vitest';
import { createSession, nextStageIndex } from '../engine/session';
import { finalize } from '../history/attempt';
import { deepFreeze, fightConfig, pullUps, STARTED_AT, testDeps } from '../testing/fixtures';
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

  // §24.5: one set after another, each done when the player says so.
  it('plays set by set', () => {
    const session = deepFreeze(start());

    expect(session).toMatchObject({ mode: 'campaign', schemaVersion: 4, challenge: null, game: null });

    const done = completeSet(completeSet(completeSet(session)));

    expect(nextStageIndex(done)).toBeNull();
    expect(finalize(done, STARTED_AT).result).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: true },
        { target: 3, done: true },
      ],
      outcome: 'win',
    });
  });

  it('is lost when the player retreats', () => {
    const left = retreat(completeSet(start()));

    expect(nextStageIndex(left)).toBeNull();
    expect(finalize(left, STARTED_AT).result).toEqual({
      sets: [
        { target: 1, done: true },
        { target: 2, done: false },
        { target: 3, done: false },
      ],
      outcome: 'loss',
    });
  });
});

describe('a fight', () => {
  // §6: the same sets one after another, and a retreat loses what is left.
  it('is won set by set and lost by a retreat', () => {
    let won = createSession(fightConfig(), testDeps());

    while (nextStageIndex(won) !== null) {
      won = completeSet(won);
    }

    expect(finalize(won, STARTED_AT).result.outcome).toBe('win');
    expect(finalize(retreat(completeSet(createSession(fightConfig(), testDeps()))), STARTED_AT).result.outcome).toBe('loss');
  });
});

describe('entering a battle', () => {
  // §24.4: a start takes a unit of the pool and keeps the new state of the pool in the session.
  it('marks the session with its pool of energy', () => {
    const session = start();

    expect(enterBattle(session, 'campaign', null)?.game).toEqual({
      pool: 'campaign',
      energyFullAt: '2026-10-30T15:00:00.000Z',
    });
  });

  it('is refused with no energy left', () => {
    expect(enterBattle(createSession(fightConfig(), testDeps()), 'fight', '2026-10-31T06:00:00.000Z')).toBeNull();
  });
});
