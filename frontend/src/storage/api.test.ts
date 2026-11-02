import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../domain/engine/session';
import { ladderConfig, targetConfig, testDeps } from '../domain/testing/fixtures';
import { createApiStorage, createBrowserStorage } from './api';
import { createBrowserBuffer } from './buffer';
import type { GameStorage } from './contract';
import { StorageError } from './errors';
import { newId } from './ids';
import { finishedAttempt } from './testing/attempts';
import { createFakeServer, type FakeServer } from './testing/fakeServer';

describe('storage over the API', () => {
  let server: FakeServer;
  let storage: GameStorage;

  beforeEach(() => {
    server = createFakeServer();
    storage = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('guests', () => {
    // §15.1: bots and visitors who only look leave nothing on the server.
    it('reads without creating a guest', async () => {
      await storage.account.current();
      await storage.exercises.list();
      await storage.exercises.remove(newId());
      await storage.attempts.list();
      await storage.attempts.get(newId());
      await storage.attempts.stats();
      await storage.account.deleteData();

      expect(server.guests).toBe(0);
    });

    it('asks the server who the user is only once', async () => {
      await storage.account.current();
      await storage.exercises.list();
      await storage.settings.get('target');

      expect(server.requests).toEqual(['GET /api/v1/me']);
    });

    // Each module of the server answers for its own data, and the browser asks it once.
    it('loads each kind of data once', async () => {
      await storage.settings.save(targetConfig());
      const requests = server.requests.length;

      await Promise.all([storage.exercises.list(), storage.exercises.list()]);
      await storage.settings.get('target');
      await storage.settings.get('ladder');

      expect(server.requests.slice(requests)).toEqual(['GET /api/v1/exercises', 'GET /api/v1/settings']);
    });

    it('creates one guest when two writes start together', async () => {
      await Promise.all([
        storage.settings.save(targetConfig()),
        storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' }),
      ]);

      expect(server.guests).toBe(1);
    });

    // The cookie is gone, for example because the browser cleared site data.
    it('starts over as a new guest when the server no longer knows the browser', async () => {
      await storage.settings.save(targetConfig());
      const first = await storage.account.current();
      server.clearCookie();

      await storage.settings.save(ladderConfig());

      expect(await storage.account.current()).not.toEqual(first);
      expect(await storage.settings.get('ladder')).toEqual(ladderConfig());
      expect(server.guests).toBe(2);
    });
  });

  // save() starts sending in the background and flush() waits for that, so a test that keeps an
  // attempt waiting makes both tries fail.
  describe('attempts without the network', () => {
    // §15.4
    it('keeps an attempt finished offline and sends it once the network is back', async () => {
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      server.online = false;

      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      expect(await storage.attempts.get(attempt.id)).toEqual({ attempt, status: 'pending' });

      server.online = true;
      await storage.attempts.flush();

      expect(await storage.attempts.get(attempt.id)).toEqual({ attempt, status: 'saved' });
      expect(server.savedAttempts()).toEqual([attempt]);
    });

    it('tries again by itself, less often each time', async () => {
      vi.useFakeTimers();
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      server.online = false;

      // Two failed tries: the pause before the next one has grown from 5 to 10 seconds.
      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      server.online = true;
      await vi.advanceTimersByTimeAsync(9_999);

      expect(server.requests).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    it('shows waiting attempts in the history and the statistics', async () => {
      await storage.attempts.save(finishedAttempt('win', '2026-11-02T09:00:00.000Z'));
      await storage.attempts.flush();
      const waiting = finishedAttempt('loss', '2026-11-02T10:00:00.000Z');
      server.failNext(503, 2);

      await storage.attempts.save(waiting);
      await storage.attempts.flush();

      expect((await storage.attempts.list()).items.map(({ status }) => status)).toEqual([
        'pending',
        'saved',
      ]);
      expect(await storage.attempts.stats()).toEqual({ total: 2, wins: 1, draws: 0, losses: 1 });
      expect(await storage.attempts.stats({ outcome: 'win' })).toEqual({
        total: 1,
        wins: 1,
        draws: 0,
        losses: 0,
      });
    });

    it('marks an attempt the server refuses and stops sending it', async () => {
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      await storage.settings.save(targetConfig());
      server.failNext(422);

      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      const requests = server.requests.length;
      await storage.attempts.flush();

      expect(await storage.attempts.get(attempt.id)).toEqual({ attempt, status: 'rejected' });
      expect(server.requests).toHaveLength(requests);
    });

    // A browser has one guest at a time: the attempts of the guest it lost belong to the next one.
    it('gives the attempts of a lost guest to the new one', async () => {
      await storage.settings.save(targetConfig());
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      server.online = false;
      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      server.online = true;
      server.clearCookie();

      await storage.attempts.flush();

      expect(server.guests).toBe(2);
      expect(server.savedAttempts()).toEqual([attempt]);
    });

    it('deletes the attempts waiting in the browser together with the data', async () => {
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      await storage.settings.save(targetConfig());
      storage.activeSession.save(createSession(targetConfig(), testDeps()));
      server.failNext(503, 2);
      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      await storage.account.deleteData();

      expect(await storage.attempts.get(attempt.id)).toBeNull();
      expect(storage.activeSession.load()).toBeNull();
      expect(server.guests).toBe(0);
    });
  });

  describe('failures', () => {
    it.each([
      [
        'offline',
        () => {
          server.online = false;
        },
      ],
      ['server', () => server.failNext(500)],
      ['rate-limited', () => server.failNext(429)],
      ['rejected', () => server.failNext(422)],
    ] as const)('reports %s so the screen can explain it', async (code, failure) => {
      await storage.account.current();
      failure();

      await expect(storage.settings.save(targetConfig())).rejects.toEqual(new StorageError(code));
    });

    it.each([
      ['a page instead of JSON', '/api/v1/me', '<h1>Bad gateway</h1>', (s: GameStorage) => s.account.current()],
      ['a user without an id', '/api/v1/me', { user: { kind: 'guest' } }, (s: GameStorage) => s.account.current()],
      ['an exercise without a name', '/api/v1/exercises', [{ id: 'a' }], (s: GameStorage) => s.exercises.list()],
      ['settings as a list', '/api/v1/settings', [], (s: GameStorage) => s.settings.get('target')],
      ['a page without items', '/api/v1/attempts', { nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['an attempt without an id', '/api/v1/attempts', { items: [{}], nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['statistics without numbers', '/api/v1/stats', { total: '1' }, (s: GameStorage) => s.attempts.stats()],
      ['an export without attempts', '/api/v1/me/export', { exportedAt: '' }, (s: GameStorage) => s.account.exportData()],
    ])('reports %s as a server failure', async (_, brokenPath, body, read) => {
      const guest = { user: { id: newId(), kind: 'guest', createdAt: '' } };
      const broken = createApiStorage({
        // Every other answer introduces a user, so the read reaches the broken one.
        fetch: (path) =>
          Promise.resolve(
            new Response(path === brokenPath ? (typeof body === 'string' ? body : JSON.stringify(body)) : JSON.stringify(guest)),
          ),
        buffer: createBrowserBuffer(null),
      });

      await expect(read(broken)).rejects.toEqual(new StorageError('server'));
    });

    it('asks again after a failed request', async () => {
      server.online = false;
      await expect(storage.account.current()).rejects.toEqual(new StorageError('offline'));

      server.online = true;

      expect(await storage.account.current()).toBeNull();
    });
  });

  it('sends the cookie and JSON', async () => {
    const fetch = vi.fn(server.fetch);
    const tracked = createApiStorage({ fetch, buffer: createBrowserBuffer(null) });

    await tracked.settings.save(ladderConfig());

    expect(fetch).toHaveBeenLastCalledWith('/api/v1/settings/ladder', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(ladderConfig()),
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });
});

describe('storage of the running game', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('keeps the browser buffer in localStorage', () => {
    expect(createBrowserStorage().persistent).toBe(true);
  });

  it('sends waiting attempts when the connection comes back', async () => {
    const server = createFakeServer();
    vi.stubGlobal('fetch', server.fetch);
    const storage = createBrowserStorage();
    server.online = false;
    const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
    await storage.attempts.save(attempt);
    await storage.attempts.flush();
    server.online = true;

    window.dispatchEvent(new Event('online'));
    await storage.attempts.flush();

    expect(server.savedAttempts()).toEqual([attempt]);
  });
});
