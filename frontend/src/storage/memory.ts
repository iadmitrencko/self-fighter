import { exerciseNameKey } from '../domain/catalog/exercise';
import type { Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import { computeStatistics } from '../domain/history/statistics';
import type { CurrentUser, CustomExercise, GameStorage, Settings, StoredAttempt } from './contract';
import { StorageError } from './errors';
import { matches, newestFirst, PAGE_SIZE } from './history';
import { newId } from './ids';

// The storage without a server, for tests of the screens. It behaves as the API does (section 3.7 of the plan).
export function createMemoryStorage(): GameStorage {
  let user: CurrentUser | null = null;
  let exercises: readonly CustomExercise[] = [];
  let settings: Settings = {};
  let attempts: readonly Attempt[] = [];
  let session: Session | null = null;

  const signUp = (): CurrentUser =>
    (user ??= { id: newId(), kind: 'guest', createdAt: new Date().toISOString() });
  const saved = (attempt: Attempt): StoredAttempt => ({ attempt, status: 'saved' });

  return {
    persistent: true,
    account: {
      current: () => Promise.resolve(user),
      exportData: () =>
        Promise.resolve(
          user === null
            ? null
            : {
                exportedAt: new Date().toISOString(),
                user,
                exercises,
                settings,
                attempts: [...attempts].sort(
                  (a, b) => a.finishedAt.localeCompare(b.finishedAt) || a.id.localeCompare(b.id),
                ),
              },
        ),
      deleteData() {
        user = null;
        exercises = [];
        settings = {};
        attempts = [];
        session = null;

        return Promise.resolve();
      },
    },
    exercises: {
      list: () => Promise.resolve(exercises),
      save(exercise) {
        const name = exercise.name.trim().normalize('NFC');
        const key = exerciseNameKey(name);

        if (exercises.some(({ id, name }) => id !== exercise.id && exerciseNameKey(name) === key)) {
          return Promise.reject(new StorageError('exercise-name-taken'));
        }
        signUp();
        const stored = { id: exercise.id, name, description: exercise.description.trim().normalize('NFC') };
        const index = exercises.findIndex(({ id }) => id === exercise.id);
        exercises = index === -1 ? [...exercises, stored] : exercises.with(index, stored);

        return Promise.resolve(stored);
      },
      remove(id) {
        exercises = exercises.filter((exercise) => exercise.id !== id);

        return Promise.resolve();
      },
    },
    settings: {
      get: (mode) => Promise.resolve(settings[mode] ?? null),
      save(config) {
        signUp();
        settings = { ...settings, [config.mode]: config };

        return Promise.resolve();
      },
    },
    attempts: {
      save(attempt) {
        const existing = attempts.find(({ id }) => id === attempt.id);

        // A finished attempt never changes (§17.2).
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(attempt)) {
          return Promise.reject(new StorageError('rejected'));
        }
        signUp();
        attempts = existing === undefined ? [...attempts, structuredClone(attempt)] : attempts;

        return Promise.resolve();
      },
      get: (id) => {
        const attempt = attempts.find((item) => item.id === id);

        return Promise.resolve(attempt === undefined ? null : saved(attempt));
      },
      list(query = {}) {
        const found = attempts.filter((attempt) => matches(attempt, query)).map(saved).sort(newestFirst);
        const start = query.cursor === undefined ? 0 : found.findIndex(({ attempt }) => attempt.id === query.cursor) + 1;
        const items = found.slice(start, start + (query.limit ?? PAGE_SIZE));
        const last = items.at(-1);

        return Promise.resolve({
          items,
          nextCursor: last !== undefined && start + items.length < found.length ? last.attempt.id : null,
        });
      },
      stats: (filter = {}) =>
        Promise.resolve(computeStatistics(attempts.filter((attempt) => matches(attempt, filter)))),
      flush: () => Promise.resolve(),
    },
    activeSession: {
      load: () => session,
      save(current) {
        session = structuredClone(current);
      },
      clear() {
        session = null;
      },
    },
  };
}
