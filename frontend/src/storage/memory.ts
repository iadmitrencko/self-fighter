import { exerciseNameKey } from '../domain/catalog/exercise';
import { isFightSession, isJourneySession, type Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import { computeStatistics } from '../domain/history/statistics';
import { computeGameRecord } from '../domain/kozak/record';
import type {
  ActiveSessionStore,
  CurrentUser,
  CustomExercise,
  GameStorage,
  Settings,
  StoredAttempt,
} from './contract';
import { StorageError } from './errors';
import { matches, newestFirst, PAGE_SIZE } from './history';
import { newId } from './ids';
import { cleanNickname } from './nickname';

// A Google account as the tests sign in with it.
export interface TestGoogleAccount {
  readonly sub: string;
  readonly name?: string;
  readonly email?: string;
}

export interface MemoryStorage extends GameStorage {
  // For tests only: the person comes back from Google, and the server opens the account (§23.2).
  signIn(account: TestGoogleAccount): void;
}

export interface MemoryStorageOptions {
  // The game needs an account (§23.1), so the screens are tried signed in, as a person Google gave
  // neither a name nor an email. false starts with a browser nobody signed in on.
  readonly signedIn?: boolean;
}

interface Person {
  user: CurrentUser;
  // The Google account the person signs in with, by its id.
  google: string | null;
  exercises: readonly CustomExercise[];
  settings: Settings;
  attempts: readonly Attempt[];
}

// The storage without a server, for tests of the screens. It behaves as the API does (section 3.7 of the plan).
export function createMemoryStorage({ signedIn = true }: MemoryStorageOptions = {}): MemoryStorage {
  const people = new Map<string, Person>();
  // The account signed in on this browser.
  let current: string | null = null;
  // The battles of the game in progress.
  const sessions = new Map<string, Session>();
  const sessionStore = <TSession extends Session>(
    key: string,
    kind: (session: Session) => session is TSession,
  ): ActiveSessionStore<TSession> => ({
    load() {
      const session = sessions.get(key);

      return session !== undefined && kind(session) ? session : null;
    },
    save(value) {
      sessions.set(key, structuredClone(value));
    },
    clear() {
      sessions.delete(key);
    },
  });

  const person = (): Person | null => (current === null ? null : (people.get(current) ?? null));
  const now = () => new Date().toISOString();

  // The account a write goes to: a write needs one, as on the server.
  function holder(): Person {
    const found = person();

    if (found === null) {
      throw new StorageError('signed-out');
    }

    return found;
  }

  // §23.2: a Google account used for the first time creates the account, a known one opens it.
  function signIn({ sub, name, email }: TestGoogleAccount): void {
    const linked = [...people.values()].find((someone) => someone.google === sub);

    if (linked === undefined) {
      const created: Person = {
        user: { id: newId(), createdAt: now(), nickname: null, name: name ?? null, email: email ?? null },
        google: sub,
        exercises: [],
        settings: {},
        attempts: [],
      };
      people.set(created.user.id, created);
      current = created.user.id;
    } else {
      linked.user = { ...linked.user, name: name ?? null, email: email ?? null };
      current = linked.user.id;
    }
  }

  // Leaves the browser without an account.
  function forget(): void {
    current = null;
    sessions.clear();
  }

  // A rejected promise rather than a throw, as the API answers.
  function write<T>(change: (owner: Person) => T): Promise<T> {
    try {
      return Promise.resolve(change(holder()));
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new StorageError('server'));
    }
  }

  const saved = (attempt: Attempt): StoredAttempt => ({ attempt, status: 'saved' });

  if (signedIn) {
    signIn({ sub: 'tester' });
  }

  return {
    persistent: true,
    signIn,
    account: {
      current: () => Promise.resolve(person()?.user ?? null),
      rename(nickname) {
        const clean = cleanNickname(nickname);

        if (clean === false) {
          return Promise.reject(new StorageError('rejected'));
        }

        return write((owner) => {
          owner.user = { ...owner.user, nickname: clean };
        });
      },
      signOut() {
        forget();

        return Promise.resolve();
      },
      deleteData() {
        if (current !== null) {
          people.delete(current);
        }
        forget();

        return Promise.resolve();
      },
    },
    exercises: {
      list: () => Promise.resolve(person()?.exercises ?? []),
      save(exercise) {
        const name = exercise.name.trim().normalize('NFC');
        const key = exerciseNameKey(name);

        if ((person()?.exercises ?? []).some(({ id, name }) => id !== exercise.id && exerciseNameKey(name) === key)) {
          return Promise.reject(new StorageError('exercise-name-taken'));
        }

        return write((owner) => {
          const stored = { id: exercise.id, name, description: exercise.description.trim().normalize('NFC') };
          const index = owner.exercises.findIndex(({ id }) => id === exercise.id);
          owner.exercises = index === -1 ? [...owner.exercises, stored] : owner.exercises.with(index, stored);

          return stored;
        });
      },
      remove(id) {
        return write((owner) => {
          owner.exercises = owner.exercises.filter((exercise) => exercise.id !== id);
        });
      },
    },
    settings: {
      get: (mode) => Promise.resolve(person()?.settings[mode] ?? null),
      save(config) {
        return write((owner) => {
          owner.settings = { ...owner.settings, [config.mode]: config };
        });
      },
    },
    attempts: {
      save(attempt) {
        const existing = [...people.values()].flatMap(({ attempts }) => attempts).find(({ id }) => id === attempt.id);

        // A finished attempt never changes (§17.2).
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(attempt)) {
          return Promise.reject(new StorageError('rejected'));
        }

        return write((owner) => {
          if (existing === undefined) {
            owner.attempts = [...owner.attempts, structuredClone(attempt)];
          }
        });
      },
      get: (id) => {
        const attempt = person()?.attempts.find((item) => item.id === id);

        return Promise.resolve(attempt === undefined ? null : saved(attempt));
      },
      list(query = {}) {
        const found = (person()?.attempts ?? [])
          .filter((attempt) => matches(attempt, query))
          .map(saved)
          .sort(newestFirst);
        const start = query.cursor === undefined ? 0 : found.findIndex(({ attempt }) => attempt.id === query.cursor) + 1;
        const items = found.slice(start, start + (query.limit ?? PAGE_SIZE));
        const last = items.at(-1);

        return Promise.resolve({
          items,
          nextCursor: last !== undefined && start + items.length < found.length ? last.attempt.id : null,
        });
      },
      stats: (filter = {}) =>
        Promise.resolve(computeStatistics((person()?.attempts ?? []).filter((attempt) => matches(attempt, filter)))),
      game: (timeZone) => Promise.resolve(computeGameRecord(person()?.attempts ?? [], timeZone)),
      flush: () => Promise.resolve(),
      // Nothing waits: the memory is the server.
      unsent: () => Promise.resolve(0),
    },
    gameSessions: {
      fight: sessionStore('fight', isFightSession),
      campaign: sessionStore('campaign', isJourneySession),
    },
  };
}
