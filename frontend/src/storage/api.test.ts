import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../domain/engine/session';
import { ladderConfig, targetConfig, testDeps } from '../domain/testing/fixtures';
import { createApiStorage, createBrowserStorage } from './api';
import { createBrowserBuffer, type BrowserBuffer } from './buffer';
import type { GameStorage } from './contract';
import { StorageError } from './errors';
import { newId } from './ids';
import { finishedAttempt, levelAttempt } from './testing/attempts';
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

    // A screen that has read the data shows its own changes without asking the server again.
    it('keeps the loaded data up to date after changes', async () => {
      const burpees = await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      await storage.exercises.list();
      await storage.settings.get('target');
      const requests = server.requests.length;

      const pullUps = await storage.exercises.save({ id: newId(), name: 'Підтягування', description: '' });
      const renamed = await storage.exercises.save({ ...burpees, name: 'Бурпі зі стрибком' });
      await storage.settings.save(ladderConfig());

      expect(await storage.exercises.list()).toEqual([renamed, pullUps]);
      expect(await storage.settings.get('ladder')).toEqual(ladderConfig());
      expect(server.requests.slice(requests)).toEqual([
        `PUT /api/v1/exercises/${pullUps.id}`,
        `PUT /api/v1/exercises/${burpees.id}`,
        'PUT /api/v1/settings/ladder',
      ]);
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
      expect(await storage.attempts.stats({ outcome: 'win' })).toEqual({ total: 1, wins: 1, draws: 0, losses: 0 });
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
      storage.gameSessions.fight.save(createSession(targetConfig(), testDeps()));
      server.failNext(503, 2);
      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      await storage.account.deleteData();

      expect(await storage.attempts.get(attempt.id)).toBeNull();
      expect(storage.gameSessions.fight.load()).toBeNull();
      expect(server.guests).toBe(0);
    });
  });

  // §24, §15.4: a battle of the game starts and ends without the network.
  describe('the record of the game without the network', () => {
    const won = (level: string, finishedAt: string, energyFullAt: string) =>
      levelAttempt(level, 'win', finishedAt, energyFullAt);

    it('counts a battle that waits for the network with what the server said last', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      expect((await storage.attempts.game()).passed).toEqual(['forest-ravens/1/1']);

      server.online = false;
      await storage.attempts.save(won('forest-ravens/1/2', '2026-11-02T11:00:00.000Z', '2026-11-02T20:00:00.000Z'));
      await storage.attempts.flush();

      expect(await storage.attempts.game()).toMatchObject({
        campaign: { wins: 2, draws: 0, losses: 0 },
        passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
        energy: { fight: null, campaign: '2026-11-02T20:00:00.000Z' },
      });
    });

    // A guest made just now has nothing on the server yet, so its first battle ends without the network.
    it('knows the record of a guest made just now', async () => {
      await storage.settings.save(targetConfig());
      server.online = false;
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));

      expect(await storage.attempts.game()).toMatchObject({
        campaign: { wins: 1, draws: 0, losses: 0 },
        passed: ['forest-ravens/1/1'],
      });
    });

    // §15.4: the network went away before the first write made the browser a guest.
    it('counts the battles of a browser that lost the network before it became a guest', async () => {
      await storage.attempts.game();
      server.online = false;
      await expect(storage.settings.save(targetConfig())).rejects.toEqual(new StorageError('offline'));
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));

      expect((await storage.attempts.game()).passed).toEqual(['forest-ravens/1/1']);
    });

    it('needs the server once before it can count without it', async () => {
      await storage.settings.save(targetConfig());
      // The page opens again: the guest of the browser may have battles only the server knows.
      const reopened = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
      await reopened.account.current();
      server.online = false;

      await expect(reopened.attempts.game()).rejects.toEqual(new StorageError('offline'));
    });

    it('does not take a failure of the server for a missing network', async () => {
      await storage.settings.save(targetConfig());
      await storage.attempts.game();
      server.failNext(500);

      await expect(storage.attempts.game()).rejects.toEqual(new StorageError('server'));
    });

    it('asks nothing while the browser has no user', async () => {
      expect((await storage.attempts.game()).passed).toEqual([]);
      expect(server.requests).not.toContain('GET /api/v1/game');
    });

    it('starts over when the server no longer knows the browser', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      server.clearCookie();

      expect((await storage.attempts.game()).passed).toEqual([]);
    });

    it('forgets the record of the previous user', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      await storage.attempts.game();
      await storage.account.deleteData();
      await storage.settings.save(targetConfig());
      server.online = false;

      expect((await storage.attempts.game()).passed).toEqual([]);
    });
  });

  // §15.4, §23.3: an attempt that waits in the browser reaches its own user and nobody else.
  describe('attempts waiting while signing in and out', () => {
    const OLENA = { sub: '1001', name: 'Олена' };
    let buffer: BrowserBuffer;

    // Google sends the browser back, and the page loads again with the same localStorage.
    async function signIn(): Promise<void> {
      server.signIn(OLENA);
      storage = createApiStorage({ fetch: server.fetch, buffer });
      await storage.account.current();
    }

    async function finishOffline(): Promise<ReturnType<typeof finishedAttempt>> {
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');
      server.online = false;
      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      server.online = true;

      return attempt;
    }

    beforeEach(() => {
      buffer = createBrowserBuffer(null);
      storage = createApiStorage({ fetch: server.fetch, buffer });
    });

    it('sends the attempts of a guest to the account it became', async () => {
      await storage.settings.save(targetConfig());
      const attempt = await finishOffline();

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // The guest became the account, so its waiting attempts are the account's and wait for it.
    it('keeps the attempts of a guest that became the account for the account', async () => {
      vi.useFakeTimers();
      await storage.settings.save(targetConfig());
      const attempt = await finishOffline();
      await signIn();
      server.failNext(503);
      await storage.attempts.flush();

      await storage.account.signOut();
      await storage.settings.save(ladderConfig());
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);
      expect(await storage.attempts.get(attempt.id)).toBeNull();
    });

    // §15.4: they wait for the account to sign in on this browser again.
    it('keeps the attempts of the account for the account after signing out', async () => {
      await signIn();
      const attempt = await finishOffline();

      expect(await storage.attempts.unsent()).toBe(1);

      await storage.account.signOut();
      await storage.settings.save(ladderConfig());
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);
      expect(await storage.attempts.get(attempt.id)).toBeNull();
      expect(await storage.attempts.unsent()).toBe(0);

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // A guest joined at once at the sign-in leaves its waiting attempts to the account: after
    // signing out they must not go to the next guest.
    it('gives the account the attempts of a guest that joined it', async () => {
      await signIn();
      await storage.account.signOut();
      await storage.settings.save(ladderConfig());
      const attempt = await finishOffline();
      await signIn();

      await storage.account.signOut();
      await storage.settings.save(targetConfig());
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    it('keeps the attempts of the kept guest for it until it joins the account', async () => {
      await signIn();
      await storage.account.signOut();
      await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      const attempt = await finishOffline();

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);
      expect(await storage.account.keptGuest()).toMatchObject({ attempts: 1, exercises: 1 });
      expect((await storage.attempts.list()).items).toEqual([]);

      await storage.account.joinGuest();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
      expect((await storage.attempts.list()).items).toEqual([{ attempt, status: 'saved' }]);
    });

    it('sends the attempts of the kept guest once the browser is its own again', async () => {
      await signIn();
      await storage.account.signOut();
      await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      const attempt = await finishOffline();
      await signIn();

      await storage.account.signOut();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // The next person on this browser does not continue the fight of the account.
    it('forgets the attempt in progress on signing out', async () => {
      await signIn();
      storage.gameSessions.fight.save(createSession(targetConfig(), testDeps()));

      await storage.account.signOut();

      expect(storage.gameSessions.fight.load()).toBeNull();
    });

    // The account has taken in the exercises of the guest, so the list loads again.
    it('reloads the exercises after joining the guest', async () => {
      await signIn();
      await storage.account.signOut();
      const plank = await storage.exercises.save({ id: newId(), name: 'Планка', description: '' });
      await signIn();
      expect(await storage.exercises.list()).toEqual([]);

      await storage.account.joinGuest();

      expect(await storage.exercises.list()).toEqual([plank]);
    });

    // The account was deleted on another device, so the cookie of this browser leads nowhere.
    it('signs out without a user when the account is gone', async () => {
      await signIn();
      server.clearCookie();

      await storage.account.signOut();

      expect(await storage.account.current()).toBeNull();
    });

    it('joins nothing when the account is gone', async () => {
      await signIn();
      await storage.account.signOut();
      await storage.exercises.save({ id: newId(), name: 'Планка', description: '' });
      await signIn();
      server.clearCookie();

      await storage.account.joinGuest();

      expect(await storage.account.current()).toBeNull();
      expect(await storage.account.keptGuest()).toBeNull();
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
      ['an account without a name', '/api/v1/me', { user: { id: 'a', kind: 'account', createdAt: '' } }, (s: GameStorage) => s.account.current()],
      ['a user of another kind', '/api/v1/me', { user: { id: 'a', kind: 'admin', createdAt: '' } }, (s: GameStorage) => s.account.current()],
      [
        'a kept guest without counts',
        '/api/v1/me',
        { user: { id: 'a', kind: 'account', createdAt: '', name: null, email: null }, guest: { id: 'b', attempts: 1 } },
        (s: GameStorage) => s.account.keptGuest(),
      ],
      [
        'a way to sign in without a subject',
        '/api/v1/me/export',
        { exportedAt: '', user: { id: 'a', kind: 'guest', createdAt: '' }, identities: [{ provider: 'google' }], exercises: [], settings: {}, attempts: [], events: [] },
        (s: GameStorage) => s.account.exportData(),
      ],
      ['an exercise without a name', '/api/v1/exercises', [{ id: 'a' }], (s: GameStorage) => s.exercises.list()],
      ['settings as a list', '/api/v1/settings', [], (s: GameStorage) => s.settings.get('target')],
      ['a page without items', '/api/v1/attempts', { nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['an attempt without an id', '/api/v1/attempts', { items: [{}], nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['statistics without numbers', '/api/v1/stats', { total: '1' }, (s: GameStorage) => s.attempts.stats()],
      ['an export without attempts', '/api/v1/me/export', { exportedAt: '' }, (s: GameStorage) => s.account.exportData()],
      [
        'an event without a name',
        '/api/v1/me/export',
        { exportedAt: '', user: { id: 'a', kind: 'guest', createdAt: '' }, exercises: [], settings: {}, attempts: [], events: [{ mode: 'target', occurredAt: '' }] },
        (s: GameStorage) => s.account.exportData(),
      ],
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

  // §15.5: the file holds everything the server keeps, the events of analytics too.
  it('keeps the events of analytics in the export', async () => {
    const user = { id: newId(), kind: 'guest', createdAt: '2026-11-03T10:00:00.000Z' };
    const events = [
      { name: 'setup_error', mode: 'target', error: 'target-required', occurredAt: '2026-11-03T10:00:00.000Z' },
      { name: 'workout_completed', mode: 'ladder', outcome: 'win', occurredAt: '2026-11-03T10:05:00.000Z' },
    ];
    const exported = createApiStorage({
      fetch: (path) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              path === '/api/v1/me'
                ? { user }
                : { exportedAt: '2026-11-03T11:00:00.000Z', user, exercises: [], settings: {}, attempts: [], events },
            ),
          ),
        ),
      buffer: createBrowserBuffer(null),
    });

    expect((await exported.account.exportData())?.events).toEqual(events);
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
