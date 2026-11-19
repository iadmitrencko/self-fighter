import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../domain/engine/session';
import { fightConfig, pullUps, testDeps } from '../domain/testing/fixtures';
import { createApiStorage } from './api';
import { createBrowserBuffer } from './buffer';
import type { GameStorage } from './contract';
import { StorageError } from './errors';
import { newId } from './ids';
import { createMemoryStorage, type TestGoogleAccount } from './memory';
import { levelConfig } from '../domain/kozak/battle';
import { findLevel, SICH } from '../domain/kozak/journey';
import { duelAttempt, finishedFight, gameFight, levelAttempt } from './testing/attempts';
import { createFakeServer } from './testing/fakeServer';

// Screens rely on these rules whichever storage runs underneath (section 3.7 of the plan). The game
// needs an account (§23.1), so the browser has signed in.
describe.each([
  ['in memory', (): GameStorage => createMemoryStorage()],
  [
    'over the API',
    (): GameStorage => {
      const server = createFakeServer();
      server.signIn({ sub: 'tester' });

      return createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
    },
  ],
])('storage %s', (_, create) => {
  let storage: GameStorage;

  beforeEach(() => {
    storage = create();
  });

  describe('account', () => {
    // §24.11: the name is cleaned, and an empty one takes it away.
    it('names the cossack', async () => {
      await storage.account.rename(' Іван \n  Сірко ');

      expect(await storage.account.current()).toMatchObject({ nickname: 'Іван Сірко' });

      await storage.account.rename('   ');

      expect(await storage.account.current()).toMatchObject({ nickname: null });
    });

    it('refuses a name longer than allowed', async () => {
      await expect(storage.account.rename('я'.repeat(41))).rejects.toEqual(new StorageError('rejected'));
      await storage.account.rename('я'.repeat(40));

      expect(await storage.account.current()).toMatchObject({ nickname: 'я'.repeat(40) });
    });

    it('deletes every piece of data', async () => {
      await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      await storage.attempts.save(finishedFight('win', '2026-11-02T10:00:00.000Z'));
      await storage.attempts.flush();
      storage.gameSessions.fight.save(createSession(fightConfig(), testDeps()));

      await storage.account.deleteData();

      expect(await storage.account.current()).toBeNull();
      expect(await storage.exercises.list()).toEqual([]);
      expect(await storage.attempts.list()).toEqual({ items: [], nextCursor: null });
      expect(storage.gameSessions.fight.load()).toBeNull();
    });
  });

  describe('exercises', () => {
    it('creates, renames and removes a custom exercise', async () => {
      const id = newId();

      await storage.exercises.save({ id, name: 'Бурпі', description: '' });
      await storage.exercises.save({ id, name: 'Бурпі зі стрибком', description: 'Вибухово' });

      expect(await storage.exercises.list()).toEqual([
        { id, name: 'Бурпі зі стрибком', description: 'Вибухово' },
      ]);

      await storage.exercises.remove(id);
      await storage.exercises.remove(id);

      expect(await storage.exercises.list()).toEqual([]);
    });

    // §5.2
    it('refuses a name that differs only in case', async () => {
      await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });

      await expect(
        storage.exercises.save({ id: newId(), name: 'БУРПІ', description: '' }),
      ).rejects.toEqual(new StorageError('exercise-name-taken'));
    });
  });

  describe('settings', () => {
    // §6: the last fight of the player, so the next one starts from it.
    it('keeps the last fight', async () => {
      expect(await storage.settings.get('fight')).toBeNull();

      await storage.settings.save(fightConfig({ exercises: [{ ...pullUps, sets: [3] }] }));
      await storage.settings.save(fightConfig());

      expect(await storage.settings.get('fight')).toEqual(fightConfig());
    });
  });

  describe('attempts', () => {
    it('finds a saved attempt by its id', async () => {
      const attempt = finishedFight('loss', '2026-11-02T10:00:00.000Z');

      await storage.attempts.save(attempt);

      expect((await storage.attempts.get(attempt.id))?.attempt).toEqual(attempt);
      expect(await storage.attempts.get(newId())).toBeNull();
    });

    // §17.2: saving again after a lost answer must not add a second record.
    it('keeps one record when the same attempt is saved twice', async () => {
      const attempt = finishedFight('win', '2026-11-02T10:00:00.000Z');

      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      expect((await storage.attempts.list()).items).toHaveLength(1);
    });

    it('lists the newest first, page by page', async () => {
      const attempts = ['09', '10', '11', '12', '13'].map((hour) =>
        finishedFight('win', `2026-11-02T${hour}:00:00.000Z`),
      );

      for (const attempt of attempts) {
        await storage.attempts.save(attempt);
      }
      await storage.attempts.flush();

      const ids: string[][] = [];
      let cursor: string | undefined;

      do {
        const page = await storage.attempts.list({ limit: 2, cursor });
        ids.push(page.items.map(({ attempt }) => attempt.id));
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);

      expect(ids).toEqual([
        [attempts[4]?.id, attempts[3]?.id],
        [attempts[2]?.id, attempts[1]?.id],
        [attempts[0]?.id],
      ]);
    });

    // §14.3
    it('filters by mode, outcome and period', async () => {
      const morningWin = finishedFight('win', '2026-11-01T08:00:00.000Z');
      const eveningLoss = finishedFight('loss', '2026-11-01T20:00:00.000Z');
      const level = levelAttempt('forest-ravens/1/1', 'win', '2026-11-02T08:00:00.000Z', '2026-11-02T10:00:00.000Z');

      for (const attempt of [morningWin, eveningLoss, level]) {
        await storage.attempts.save(attempt);
      }
      await storage.attempts.flush();

      const ids = async (filter: Parameters<GameStorage['attempts']['list']>[0]) =>
        (await storage.attempts.list(filter)).items.map(({ attempt }) => attempt.id);

      expect(await ids({ mode: 'fight' })).toEqual([eveningLoss.id, morningWin.id]);
      expect(await ids({ outcome: 'win' })).toEqual([level.id, morningWin.id]);
      expect(
        await ids({ from: '2026-11-01T12:00:00.000Z', to: '2026-11-02T08:00:00.000Z' }),
      ).toEqual([eveningLoss.id]);
    });

    // §14.2: finished workouts equal wins plus draws plus losses.
    it('counts statistics that agree with the history', async () => {
      for (const outcome of ['win', 'loss', 'win'] as const) {
        await storage.attempts.save(finishedFight(outcome, '2026-11-02T10:00:00.000Z'));
      }
      await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-11-02T11:00:00.000Z', '2026-11-02T13:00:00.000Z'));
      await storage.attempts.flush();

      expect(await storage.attempts.stats()).toEqual({ total: 4, wins: 2, draws: 0, losses: 2 });
      expect(await storage.attempts.stats({ mode: 'campaign' })).toEqual({ total: 1, wins: 0, draws: 0, losses: 1 });
    });
  });

  // §24: the record of the game counts its battles.
  describe('the game', () => {
    it('counts the battles of the game', async () => {
      await storage.attempts.save(gameFight('win', '2026-11-01T11:00:00.000Z', '2026-11-01T13:00:00.000Z'));
      await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-11-02T09:00:00.000Z', '2026-11-02T14:00:00.000Z'));
      await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'win', '2026-11-02T10:00:00.000Z', '2026-11-02T19:00:00.000Z'));
      // §24.9: the first round of the duel, left after two of its three sets.
      await storage.attempts.save(duelAttempt(1, '2026-11-02T11:00:00.000Z', '2026-11-02T21:00:00.000Z', { retreatAt: 2 }));
      await storage.attempts.flush();

      expect(await storage.attempts.game('UTC')).toEqual({
        fights: { wins: 1, draws: 0, losses: 0 },
        campaign: { wins: 1, draws: 0, losses: 2 },
        passed: ['forest-ravens/1/1'],
        energy: { fight: '2026-11-01T13:00:00.000Z', campaign: '2026-11-02T21:00:00.000Z' },
        // §24.10: every set done of the fight, the levels and the duel.
        exercises: {
          'pull-ups': { best: 1, total: 3 },
          'push-ups': { best: 20, total: 67 },
          squats: { best: 20, total: 50 },
        },
        // §24.12: the days with a battle, the level left before its first set too, and their repetitions.
        days: ['2026-11-01', '2026-11-02'],
        week: { '2026-11-01': { 'push-ups': 32, squats: 50 }, '2026-11-02': { 'pull-ups': 3, 'push-ups': 35 } },
        duel: { 'final-battle/1/1': [0, 1] },
        duelAt: '2026-11-02T11:00:00.000Z',
      });
      expect((await storage.attempts.stats()).total).toBe(4);
    });

    // §24.12: the days go by the calendar of the player, wherever the record is counted.
    it('puts the battles on the days of the player', async () => {
      await storage.attempts.save(gameFight('win', '2026-11-01T22:30:00.000Z', '2026-11-02T00:30:00.000Z'));
      await storage.attempts.flush();

      expect(await storage.attempts.game('UTC')).toMatchObject({ days: ['2026-11-01'] });
      expect(await storage.attempts.game('Europe/Kyiv')).toMatchObject({
        days: ['2026-11-02'],
        week: { '2026-11-02': { 'push-ups': 32, squats: 50 } },
      });
    });

    it('has an empty record before the first battle', async () => {
      expect(await storage.attempts.game('UTC')).toEqual({
        fights: { wins: 0, draws: 0, losses: 0 },
        campaign: { wins: 0, draws: 0, losses: 0 },
        passed: [],
        energy: { fight: null, campaign: null },
        exercises: {},
        days: [],
        week: {},
        duel: {},
        duelAt: null,
      });
    });

    // §24.4: a fight and a level wait apart from each other.
    it('keeps a battle in progress for each pool of energy', async () => {
      const fight = createSession(fightConfig(), testDeps());
      const level = createSession(levelConfig(findLevel(SICH, 'forest-ravens/1/1') ?? (undefined as never), pullUps), testDeps());

      storage.gameSessions.fight.save(fight);
      storage.gameSessions.campaign.save(level);

      expect(storage.gameSessions.fight.load()).toEqual(fight);
      expect(storage.gameSessions.campaign.load()).toEqual(level);

      await storage.settings.save(fightConfig());
      await storage.account.deleteData();

      expect(storage.gameSessions.fight.load()).toBeNull();
      expect(storage.gameSessions.campaign.load()).toBeNull();
    });
  });

  describe('fight in progress', () => {
    // §12.4: a reload does not lose the attempt in progress or change the opponent.
    it('keeps the attempt in progress until it is cleared', () => {
      const session = createSession(fightConfig({ exercises: [{ ...pullUps, sets: [3, 3] }] }), testDeps());

      storage.gameSessions.fight.save(session);

      expect(storage.gameSessions.fight.load()).toEqual(session);

      storage.gameSessions.fight.clear();

      expect(storage.gameSessions.fight.load()).toBeNull();
    });
  });
});

// The browser as the tests see it: signing in leaves for Google, and the page loads again.
interface Browser {
  readonly storage: GameStorage;
  signIn(account: TestGoogleAccount): void;
}

const OLENA = { sub: '1001', name: 'Олена', email: 'olena@example.com' };

// §23: signing in, out and deleting the account follow the same contract on every storage (R14).
describe.each([
  [
    'in memory',
    (): Browser => {
      const storage = createMemoryStorage({ signedIn: false });

      return { storage, signIn: (account) => storage.signIn(account) };
    },
  ],
  [
    'over the API',
    (): Browser => {
      const server = createFakeServer();
      const buffer = createBrowserBuffer(null);
      let storage = createApiStorage({ fetch: server.fetch, buffer });

      return {
        get storage() {
          return storage;
        },
        signIn(account) {
          server.signIn(account);
          storage = createApiStorage({ fetch: server.fetch, buffer });
        },
      };
    },
  ],
])('accounts %s', (_, create) => {
  let browser: Browser;

  beforeEach(() => {
    browser = create();
  });

  // An account with a workout that is no longer open in this browser.
  async function accountElsewhere(): Promise<string> {
    browser.signIn(OLENA);
    const attempt = finishedFight('win', '2026-11-01T10:00:00.000Z');
    await browser.storage.attempts.save(attempt);
    await browser.storage.attempts.flush();
    await browser.storage.account.signOut();

    return attempt.id;
  }

  // §23.1: the game needs an account, so a browser nobody signed in on has no data and saves none.
  it('saves nothing until the person signs in', async () => {
    expect(await browser.storage.exercises.list()).toEqual([]);
    expect(await browser.storage.settings.get('fight')).toBeNull();
    expect(await browser.storage.attempts.list()).toEqual({ items: [], nextCursor: null });

    await expect(browser.storage.settings.save(fightConfig())).rejects.toEqual(new StorageError('signed-out'));
    await expect(browser.storage.account.rename('Іван')).rejects.toEqual(new StorageError('signed-out'));
    await expect(browser.storage.exercises.remove(newId())).rejects.toEqual(new StorageError('signed-out'));
    await expect(browser.storage.attempts.save(finishedFight('win', '2026-11-02T10:00:00.000Z'))).rejects.toEqual(
      new StorageError('signed-out'),
    );
    expect(await browser.storage.account.current()).toBeNull();
  });

  // §23.2: a Google account used for the first time creates the account.
  it('opens a new account on the first sign-in', async () => {
    browser.signIn(OLENA);

    expect(await browser.storage.account.current()).toEqual({
      id: expect.any(String) as string,
      createdAt: expect.any(String) as string,
      nickname: null,
      name: 'Олена',
      email: 'olena@example.com',
    });
  });

  // §23.2: after signing out the data of the account is out of reach in this browser.
  it('keeps nothing of the account in the browser after signing out', async () => {
    await accountElsewhere();

    expect(await browser.storage.account.current()).toBeNull();
    expect(await browser.storage.attempts.list()).toEqual({ items: [], nextCursor: null });
    expect(await browser.storage.attempts.stats()).toMatchObject({ total: 0 });
    // The next person on this browser does not play for the account.
    await expect(browser.storage.attempts.save(finishedFight('win', '2026-11-02T10:00:00.000Z'))).rejects.toEqual(
      new StorageError('signed-out'),
    );
  });

  it('opens the account again with its data', async () => {
    const attempt = await accountElsewhere();

    browser.signIn(OLENA);

    expect((await browser.storage.attempts.list()).items.map((stored) => stored.attempt.id)).toEqual([attempt]);
  });

  // §15.5: deleting the account leaves the browser without one, and the next sign-in starts anew.
  it('forgets the account it deletes', async () => {
    browser.signIn(OLENA);
    await browser.storage.attempts.save(finishedFight('loss', '2026-11-02T10:00:00.000Z'));
    await browser.storage.attempts.flush();

    await browser.storage.account.deleteData();

    expect(await browser.storage.account.current()).toBeNull();
    browser.signIn(OLENA);
    expect((await browser.storage.attempts.stats()).total).toBe(0);
  });
});
