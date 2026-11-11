import { afterEach, describe, expect, it } from 'vitest';
import { createSession, isCampaignSession, isWorkoutSession } from '../domain/engine/session';
import { levelConfig } from '../domain/kozak/battle';
import { findLevel, SICH } from '../domain/kozak/journey';
import { ladderConfig, pullUps, testDeps } from '../domain/testing/fixtures';
import {
  createActiveSessionStore,
  createBrowserBuffer,
  createOutbox,
  GAME_SESSION,
  type OutboxEntry,
} from './buffer';
import { finishedAttempt } from './testing/attempts';

// A localStorage that accepts the given number of writes and then reports a full quota.
function storageWithRoomFor(writes: number): Storage {
  const values = new Map<string, string>();
  let left = writes;

  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (left === 0) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      left -= 1;
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function entry(finishedAt: string, status: OutboxEntry['status'] = 'pending'): OutboxEntry {
  return { document: finishedAttempt('win', finishedAt), owner: null, status };
}

afterEach(() => {
  localStorage.clear();
});

describe('browser buffer', () => {
  it('keeps values in localStorage, where a reload finds them', () => {
    createBrowserBuffer(localStorage).write('self-fighter:a', '1');

    const reloaded = createBrowserBuffer(localStorage);

    expect(reloaded.persistent).toBe(true);
    expect(reloaded.read('self-fighter:a')).toBe('1');
  });

  // §17.2: without localStorage the game goes on in memory, and the screen warns about it.
  it.each([
    ['is missing', null],
    ['refuses every write', storageWithRoomFor(0)],
  ])('keeps values in memory when localStorage %s', (_, storage) => {
    const buffer = createBrowserBuffer(storage);

    buffer.write('self-fighter:a', '1');

    expect(buffer.persistent).toBe(false);
    expect(buffer.read('self-fighter:a')).toBe('1');
    expect(buffer.keys('self-fighter:')).toEqual(['self-fighter:a']);
  });

  it('moves to memory when localStorage fills up', () => {
    // The first write is the probe the buffer makes on start.
    const buffer = createBrowserBuffer(storageWithRoomFor(2));

    buffer.write('self-fighter:a', '1');
    buffer.write('self-fighter:b', '2');

    expect(buffer.persistent).toBe(false);
    expect(buffer.keys('self-fighter:')).toEqual(['self-fighter:a', 'self-fighter:b']);
    expect(buffer.read('self-fighter:b')).toBe('2');

    buffer.remove('self-fighter:b');

    expect(buffer.read('self-fighter:b')).toBeNull();
  });
});

describe('fight in progress', () => {
  const session = createSession(ladderConfig(), testDeps());

  const store = () => createActiveSessionStore(createBrowserBuffer(localStorage), `${GAME_SESSION}fight`, isWorkoutSession);

  it('survives a reload', () => {
    store().save(session);

    expect(store().load()).toEqual(session);
  });

  // §24.4: a level of the journey waits in its own place and never opens as a fight.
  it('keeps each kind of session in its own place', () => {
    const level = findLevel(SICH, 'forest-ravens/1/1');
    const battle = createSession(levelConfig(level ?? (undefined as never), pullUps), testDeps());
    const campaign = createActiveSessionStore(
      createBrowserBuffer(localStorage),
      `${GAME_SESSION}campaign`,
      isCampaignSession,
    );

    campaign.save(battle);
    localStorage.setItem(`${GAME_SESSION}fight`, JSON.stringify(battle));

    expect(campaign.load()).toEqual(battle);
    expect(store().load()).toBeNull();
    expect(localStorage.getItem(`${GAME_SESSION}fight`)).toBeNull();
  });

  // A release that changes the format drops the attempt in progress instead of migrating it.
  it.each([
    ['another format version', JSON.stringify({ ...session, schemaVersion: 0 })],
    ['damaged data', '{"schemaVersion":'],
  ])('forgets a session in %s', (_, stored) => {
    localStorage.setItem(`${GAME_SESSION}fight`, stored);

    expect(store().load()).toBeNull();
    expect(localStorage.getItem(`${GAME_SESSION}fight`)).toBeNull();
  });
});

describe('outbox', () => {
  it('gives the attempts in the order they finished', () => {
    const outbox = createOutbox(createBrowserBuffer(localStorage));
    const later = entry('2026-11-02T11:00:00.000Z');
    const earlier = entry('2026-11-02T10:00:00.000Z', 'rejected');

    outbox.put(later);
    outbox.put(earlier);

    expect(outbox.entries()).toEqual([earlier, later]);

    outbox.remove(earlier.document.id);

    expect(outbox.entries()).toEqual([later]);
  });

  // Two tabs queue attempts at the same time and neither loses the other's.
  it('keeps the attempts of two tabs', () => {
    const first = entry('2026-11-02T10:00:00.000Z');
    const second = entry('2026-11-02T10:00:01.000Z');

    createOutbox(createBrowserBuffer(localStorage)).put(first);
    createOutbox(createBrowserBuffer(localStorage)).put(second);

    expect(createOutbox(createBrowserBuffer(localStorage)).entries()).toEqual([first, second]);
  });

  it('keeps an attempt of an older format to send it as it is', () => {
    const old = { ...entry('2026-11-02T10:00:00.000Z'), document: { id: 'a', schemaVersion: 0, finishedAt: '2026-11-02T10:00:00.000Z' } };
    localStorage.setItem('self-fighter:outbox:a', JSON.stringify(old));

    expect(createOutbox(createBrowserBuffer(localStorage)).entries()).toEqual([old]);
  });

  it('skips damaged entries', () => {
    localStorage.setItem('self-fighter:outbox:a', '{');
    localStorage.setItem('self-fighter:outbox:b', JSON.stringify({ document: {}, owner: null, status: 'pending' }));

    expect(createOutbox(createBrowserBuffer(localStorage)).entries()).toEqual([]);
  });
});
