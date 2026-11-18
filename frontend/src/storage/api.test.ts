import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../domain/engine/session';
import { fightConfig, testDeps } from '../domain/testing/fixtures';
import { createApiStorage, createBrowserStorage } from './api';
import { createBrowserBuffer, type BrowserBuffer } from './buffer';
import type { GameStorage } from './contract';
import { StorageError } from './errors';
import { newId } from './ids';
import { finishedFight, levelAttempt } from './testing/attempts';
import { createFakeServer, type FakeServer } from './testing/fakeServer';

const NO_TALLY = { wins: 0, draws: 0, losses: 0 };
// A record of the game the server may send, for the broken ones to start from.
const GAME = {
  fights: NO_TALLY,
  campaign: NO_TALLY,
  passed: [],
  energy: { fight: null, campaign: null },
  exercises: {},
  days: [],
  week: {},
  duel: {},
  duelAt: null,
};

describe('storage over the API', () => {
  let server: FakeServer;
  let storage: GameStorage;

  beforeEach(() => {
    server = createFakeServer();
    // The game needs an account (§23.1): the person signed in before the page loaded.
    server.signIn({ sub: 'tester' });
    storage = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the account', () => {
    // §23.1: a browser nobody signed in on asks the server who it is and nothing else.
    it('asks for no data without an account', async () => {
      const visitor = createFakeServer();
      const browser = createApiStorage({ fetch: visitor.fetch, buffer: createBrowserBuffer(null) });

      await browser.exercises.list();
      await browser.exercises.remove(newId());
      await browser.attempts.list();
      await browser.attempts.get(newId());
      await browser.attempts.stats();
      await browser.attempts.game('UTC');
      await browser.account.deleteData();

      expect(visitor.requests).toEqual(['GET /api/v1/me']);
      expect(visitor.accounts).toBe(0);
    });

    it('asks the server who the user is only once', async () => {
      await storage.account.current();
      await storage.exercises.list();
      await storage.settings.get('fight');

      expect(server.requests.filter((request) => request === 'GET /api/v1/me')).toHaveLength(1);
    });

    // Each module of the server answers for its own data, and the browser asks it once.
    it('loads each kind of data once', async () => {
      await storage.account.current();
      await storage.settings.save(fightConfig());
      const requests = server.requests.length;

      await Promise.all([storage.exercises.list(), storage.exercises.list()]);
      await storage.settings.get('fight');
      await storage.settings.get('fight');

      expect(server.requests.slice(requests)).toEqual(['GET /api/v1/exercises', 'GET /api/v1/settings']);
    });

    // A screen that has read the data shows its own changes without asking the server again.
    it('keeps the loaded data up to date after changes', async () => {
      const burpees = await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      await storage.exercises.list();
      await storage.settings.get('fight');
      const requests = server.requests.length;

      const pullUps = await storage.exercises.save({ id: newId(), name: 'Підтягування', description: '' });
      const renamed = await storage.exercises.save({ ...burpees, name: 'Бурпі зі стрибком' });
      await storage.settings.save(fightConfig());

      expect(await storage.exercises.list()).toEqual([renamed, pullUps]);
      expect(await storage.settings.get('fight')).toEqual(fightConfig());
      expect(server.requests.slice(requests)).toEqual([
        `PUT /api/v1/exercises/${pullUps.id}`,
        `PUT /api/v1/exercises/${burpees.id}`,
        'PUT /api/v1/settings/fight',
      ]);
    });

    // The cookie is gone, for example after signing out in another tab (§23.2).
    it('says the browser has signed out when the server no longer knows it', async () => {
      await storage.settings.save(fightConfig());
      server.clearCookie();

      await expect(storage.settings.save(fightConfig())).rejects.toEqual(new StorageError('signed-out'));

      expect(await storage.account.current()).toBeNull();
      expect(server.accounts).toBe(1);
    });
  });

  // save() starts sending in the background and flush() waits for that, so a test that keeps an
  // attempt waiting makes both tries fail.
  describe('attempts without the network', () => {
    // §15.4
    it('keeps an attempt finished offline and sends it once the network is back', async () => {
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
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
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
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
      await storage.attempts.save(finishedFight('win', '2026-11-02T09:00:00.000Z'));
      await storage.attempts.flush();
      const waiting = finishedFight('loss', '2026-11-02T10:00:00.000Z');
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
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
      await storage.account.current();
      server.failNext(422);

      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      const requests = server.requests.length;
      await storage.attempts.flush();

      expect(await storage.attempts.get(attempt.id)).toEqual({ attempt, status: 'rejected' });
      expect(server.requests).toHaveLength(requests);
    });

    it('deletes the attempts waiting in the browser together with the data', async () => {
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
      await storage.settings.save(fightConfig());
      storage.gameSessions.fight.save(createSession(fightConfig(), testDeps()));
      server.failNext(503, 2);
      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      await storage.account.deleteData();

      expect(await storage.attempts.get(attempt.id)).toBeNull();
      expect(storage.gameSessions.fight.load()).toBeNull();
      expect(server.accounts).toBe(0);
    });
  });

  // §24, §15.4: a battle of the game starts and ends without the network.
  describe('the record of the game without the network', () => {
    const won = (level: string, finishedAt: string, energyFullAt: string) =>
      levelAttempt(level, 'win', finishedAt, energyFullAt);

    it('counts a battle that waits for the network with what the server said last', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      expect((await storage.attempts.game('UTC')).passed).toEqual(['forest-ravens/1/1']);

      server.online = false;
      await storage.attempts.save(won('forest-ravens/1/2', '2026-11-02T11:00:00.000Z', '2026-11-02T20:00:00.000Z'));
      await storage.attempts.flush();

      expect(await storage.attempts.game('UTC')).toMatchObject({
        campaign: { wins: 2, draws: 0, losses: 0 },
        passed: ['forest-ravens/1/1', 'forest-ravens/1/2'],
        energy: { fight: null, campaign: '2026-11-02T20:00:00.000Z' },
      });
    });

    // §24.4: the server keeps the energy, so a battle it refused takes no unit and wins no level.
    it('counts nothing of a battle the server refused', async () => {
      await storage.account.current();
      server.failNext(409);
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();

      expect((await storage.attempts.list()).items.map(({ status }) => status)).toEqual(['rejected']);
      expect(await storage.attempts.game('UTC')).toMatchObject({
        campaign: NO_TALLY,
        passed: [],
        energy: { fight: null, campaign: null },
      });
    });

    it('needs the server once before it can count without it', async () => {
      await storage.settings.save(fightConfig());
      // The page opens again: the account may have battles only the server knows.
      const reopened = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
      await reopened.account.current();
      server.online = false;

      await expect(reopened.attempts.game('UTC')).rejects.toEqual(new StorageError('offline'));
    });

    it('does not take a failure of the server for a missing network', async () => {
      await storage.settings.save(fightConfig());
      await storage.attempts.game('UTC');
      server.failNext(500);

      await expect(storage.attempts.game('UTC')).rejects.toEqual(new StorageError('server'));
    });

    it('starts over when the server no longer knows the browser', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      server.clearCookie();

      expect((await storage.attempts.game('UTC')).passed).toEqual([]);
    });

    // The next account on this browser never counts with what the server said of the previous one.
    it('forgets the record of the previous account', async () => {
      await storage.attempts.save(won('forest-ravens/1/1', '2026-11-02T10:00:00.000Z', '2026-11-02T15:00:00.000Z'));
      await storage.attempts.flush();
      await storage.attempts.game('UTC');
      await storage.account.deleteData();
      server.signIn({ sub: 'next' });
      await storage.account.current();
      server.online = false;

      await expect(storage.attempts.game('UTC')).rejects.toEqual(new StorageError('offline'));
    });
  });

  // §15.4, §23.2: an attempt that waits in the browser reaches its own account and nobody else.
  describe('attempts waiting while signing in and out', () => {
    const OLENA = { sub: '1001', name: 'Олена' };
    const MAKSYM = { sub: '1002', name: 'Максим' };
    let buffer: BrowserBuffer;

    // Google sends the browser back, and the page loads again with the same localStorage.
    async function signIn(account: typeof OLENA = OLENA): Promise<void> {
      server.signIn(account);
      storage = createApiStorage({ fetch: server.fetch, buffer });
      await storage.account.current();
    }

    async function finishOffline(): Promise<ReturnType<typeof finishedFight>> {
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
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

    // §15.4: they wait for the account to sign in on this browser again.
    it('keeps the attempts of the account for the account after signing out', async () => {
      await signIn();
      const attempt = await finishOffline();

      expect(await storage.attempts.unsent()).toBe(1);

      await storage.account.signOut();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);
      expect(await storage.attempts.get(attempt.id)).toBeNull();
      expect(await storage.attempts.unsent()).toBe(0);

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // Another person signs in on the same browser: the attempt of the first one is not theirs.
    it('sends no attempt of one account to another', async () => {
      await signIn();
      const attempt = await finishOffline();
      await storage.account.signOut();

      await signIn(MAKSYM);
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);
      expect((await storage.attempts.list()).items).toEqual([]);

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // The cookie is gone, as after signing out in another tab: the attempt waits for its account.
    it('keeps an attempt for the account the browser lost', async () => {
      await signIn();
      const attempt = await finishOffline();
      server.clearCookie();

      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([]);

      await signIn();
      await storage.attempts.flush();

      expect(server.savedAttempts()).toEqual([attempt]);
    });

    // The next person on this browser does not continue the fight of the account.
    it('forgets the attempt in progress on signing out', async () => {
      await signIn();
      storage.gameSessions.fight.save(createSession(fightConfig(), testDeps()));

      await storage.account.signOut();

      expect(storage.gameSessions.fight.load()).toBeNull();
    });

    // The account was deleted on another device, so the cookie of this browser leads nowhere.
    it('signs out without a user when the account is gone', async () => {
      await signIn();
      server.clearCookie();

      await storage.account.signOut();

      expect(await storage.account.current()).toBeNull();
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

      await expect(storage.settings.save(fightConfig())).rejects.toEqual(new StorageError(code));
    });

    it.each([
      ['a page instead of JSON', '/api/v1/me', '<h1>Bad gateway</h1>', (s: GameStorage) => s.account.current()],
      ['a user without an id', '/api/v1/me', { user: { createdAt: '' } }, (s: GameStorage) => s.account.current()],
      ['an account without the name of the cossack', '/api/v1/me', { user: { id: 'a', createdAt: '' } }, (s: GameStorage) => s.account.current()],
      ['an account without a name', '/api/v1/me', { user: { id: 'a', createdAt: '', nickname: null } }, (s: GameStorage) => s.account.current()],
      ['an exercise without a name', '/api/v1/exercises', [{ id: 'a' }], (s: GameStorage) => s.exercises.list()],
      ['settings as a list', '/api/v1/settings', [], (s: GameStorage) => s.settings.get('fight')],
      ['a page without items', '/api/v1/attempts', { nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['an attempt without an id', '/api/v1/attempts', { items: [{}], nextCursor: null }, (s: GameStorage) => s.attempts.list()],
      ['statistics without numbers', '/api/v1/stats', { total: '1' }, (s: GameStorage) => s.attempts.stats()],
      ['a record of the game without the exercises', '/api/v1/game', { ...GAME, exercises: undefined }, (s: GameStorage) => s.attempts.game('UTC')],
      ['a record of the game without the days', '/api/v1/game', { ...GAME, days: undefined }, (s: GameStorage) => s.attempts.game('UTC')],
      ['a day that is no date', '/api/v1/game', { ...GAME, days: ['30.10.2026'] }, (s: GameStorage) => s.attempts.game('UTC')],
      ['a week by no dates', '/api/v1/game', { ...GAME, week: { today: { 'push-ups': 1 } } }, (s: GameStorage) => s.attempts.game('UTC')],
      ['a week of no counts', '/api/v1/game', { ...GAME, week: { '2026-10-30': { 'push-ups': -1 } } }, (s: GameStorage) => s.attempts.game('UTC')],
      ['a week of no exercises', '/api/v1/game', { ...GAME, week: { '2026-10-30': 5 } }, (s: GameStorage) => s.attempts.game('UTC')],
      [
        'an exercise without its total',
        '/api/v1/game',
        { ...GAME, exercises: { 'push-ups': { best: 12 } } },
        (s: GameStorage) => s.attempts.game('UTC'),
      ],
    ])('reports %s as a server failure', async (_, brokenPath, body, read) => {
      const account = { user: { id: newId(), createdAt: '', nickname: null, name: null, email: null } };
      const broken = createApiStorage({
        // Every other answer introduces an account, so the read reaches the broken one.
        fetch: (path) =>
          Promise.resolve(
            new Response(path === brokenPath ? (typeof body === 'string' ? body : JSON.stringify(body)) : JSON.stringify(account)),
          ),
        buffer: createBrowserBuffer(null),
      });

      await expect(read(broken)).rejects.toEqual(new StorageError('server'));
    });

    it('asks again after a failed request', async () => {
      server.online = false;
      await expect(storage.account.current()).rejects.toEqual(new StorageError('offline'));

      server.online = true;

      expect(await storage.account.current()).toMatchObject({ nickname: null });
    });
  });

  it('sends the cookie and JSON', async () => {
    const fetch = vi.fn(server.fetch);
    const tracked = createApiStorage({ fetch, buffer: createBrowserBuffer(null) });

    await tracked.settings.save(fightConfig());

    expect(fetch).toHaveBeenLastCalledWith('/api/v1/settings/fight', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(fightConfig()),
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
    server.signIn({ sub: 'tester' });
    vi.stubGlobal('fetch', server.fetch);
    const storage = createBrowserStorage();
    server.online = false;
    const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');
    await storage.attempts.save(attempt);
    await storage.attempts.flush();
    server.online = true;

    window.dispatchEvent(new Event('online'));
    await storage.attempts.flush();

    expect(server.savedAttempts()).toEqual([attempt]);
  });
});
