import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../domain/engine/session';
import { ladderConfig, pullUps, targetConfig, testDeps } from '../domain/testing/fixtures';
import { createApiStorage } from './api';
import { createBrowserBuffer } from './buffer';
import type { GameStorage } from './contract';
import { StorageError } from './errors';
import { newId } from './ids';
import { createMemoryStorage } from './memory';
import { finishedAttempt } from './testing/attempts';
import { createFakeServer } from './testing/fakeServer';

// Screens rely on these rules whichever storage runs underneath (section 3.7 of the plan).
describe.each([
  ['in memory', createMemoryStorage],
  [
    'over the API',
    (): GameStorage =>
      createApiStorage({ fetch: createFakeServer().fetch, buffer: createBrowserBuffer(null) }),
  ],
])('storage %s', (_, create) => {
  let storage: GameStorage;

  beforeEach(() => {
    storage = create();
  });

  describe('account', () => {
    // §15.1: visitors who only look leave nothing behind.
    it('has no user until something is saved', async () => {
      await storage.exercises.list();
      await storage.settings.get('target');
      await storage.attempts.list();
      await storage.attempts.stats();

      expect(await storage.account.current()).toBeNull();
      expect(await storage.account.exportData()).toBeNull();
    });

    it('becomes a guest with the first write', async () => {
      await storage.settings.save(targetConfig());

      expect(await storage.account.current()).toMatchObject({ kind: 'guest' });
    });

    // §15.5
    it('exports every piece of data', async () => {
      const exercise = { id: newId(), name: 'Бурпі', description: 'Зі стрибком' };
      const earlier = finishedAttempt('win', '2026-11-01T10:00:00.000Z');
      const later = finishedAttempt('loss', '2026-11-02T10:00:00.000Z', 'ladder');
      await storage.exercises.save(exercise);
      await storage.settings.save(ladderConfig());
      await storage.attempts.save(later);
      await storage.attempts.save(earlier);
      await storage.attempts.flush();

      expect(await storage.account.exportData()).toMatchObject({
        user: await storage.account.current(),
        exercises: [exercise],
        settings: { ladder: ladderConfig() },
        attempts: [earlier, later],
      });
    });

    it('deletes every piece of data', async () => {
      await storage.exercises.save({ id: newId(), name: 'Бурпі', description: '' });
      await storage.attempts.save(finishedAttempt('win', '2026-11-02T10:00:00.000Z'));
      await storage.attempts.flush();
      storage.activeSession.save(createSession(targetConfig(), testDeps()));

      await storage.account.deleteData();

      expect(await storage.account.current()).toBeNull();
      expect(await storage.exercises.list()).toEqual([]);
      expect(await storage.attempts.list()).toEqual({ items: [], nextCursor: null });
      expect(storage.activeSession.load()).toBeNull();
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
    it('keeps the last configuration of each mode', async () => {
      await storage.settings.save(targetConfig({ rounds: 3 }));
      await storage.settings.save(ladderConfig());
      await storage.settings.save(targetConfig({ rounds: 7 }));

      expect(await storage.settings.get('target')).toEqual(targetConfig({ rounds: 7 }));
      expect(await storage.settings.get('ladder')).toEqual(ladderConfig());
      expect(await storage.settings.get('random-opponent')).toBeNull();
    });
  });

  describe('attempts', () => {
    it('finds a saved attempt by its id', async () => {
      const attempt = finishedAttempt('draw', '2026-11-02T10:00:00.000Z');

      await storage.attempts.save(attempt);

      expect((await storage.attempts.get(attempt.id))?.attempt).toEqual(attempt);
      expect(await storage.attempts.get(newId())).toBeNull();
    });

    // §17.2: saving again after a lost answer must not add a second record.
    it('keeps one record when the same attempt is saved twice', async () => {
      const attempt = finishedAttempt('win', '2026-11-02T10:00:00.000Z');

      await storage.attempts.save(attempt);
      await storage.attempts.flush();
      await storage.attempts.save(attempt);
      await storage.attempts.flush();

      expect((await storage.attempts.list()).items).toHaveLength(1);
    });

    it('lists the newest first, page by page', async () => {
      const attempts = ['09', '10', '11', '12', '13'].map((hour) =>
        finishedAttempt('win', `2026-11-02T${hour}:00:00.000Z`),
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
      const morningWin = finishedAttempt('win', '2026-11-01T08:00:00.000Z');
      const eveningLoss = finishedAttempt('loss', '2026-11-01T20:00:00.000Z');
      const ladder = finishedAttempt('win', '2026-11-02T08:00:00.000Z', 'ladder');

      for (const attempt of [morningWin, eveningLoss, ladder]) {
        await storage.attempts.save(attempt);
      }
      await storage.attempts.flush();

      const ids = async (filter: Parameters<GameStorage['attempts']['list']>[0]) =>
        (await storage.attempts.list(filter)).items.map(({ attempt }) => attempt.id);

      expect(await ids({ mode: 'target' })).toEqual([eveningLoss.id, morningWin.id]);
      expect(await ids({ outcome: 'win' })).toEqual([ladder.id, morningWin.id]);
      expect(
        await ids({ from: '2026-11-01T12:00:00.000Z', to: '2026-11-02T08:00:00.000Z' }),
      ).toEqual([eveningLoss.id]);
    });

    // §14.2: finished workouts equal wins plus draws plus losses.
    it('counts statistics that agree with the history', async () => {
      for (const outcome of ['win', 'draw', 'loss', 'win'] as const) {
        await storage.attempts.save(finishedAttempt(outcome, '2026-11-02T10:00:00.000Z'));
      }
      await storage.attempts.save(finishedAttempt('loss', '2026-11-02T11:00:00.000Z', 'ladder'));
      await storage.attempts.flush();

      expect(await storage.attempts.stats()).toEqual({ total: 5, wins: 2, draws: 1, losses: 2 });
      expect(await storage.attempts.stats({ mode: 'ladder' })).toEqual({
        total: 1,
        wins: 0,
        draws: 0,
        losses: 1,
      });
    });
  });

  describe('active session', () => {
    // §12.4: a reload does not lose the attempt in progress or change the opponent.
    it('keeps the attempt in progress until it is cleared', () => {
      const session = createSession(ladderConfig({ exercise: pullUps }), testDeps());

      storage.activeSession.save(session);

      expect(storage.activeSession.load()).toEqual(session);

      storage.activeSession.clear();

      expect(storage.activeSession.load()).toBeNull();
    });
  });
});
