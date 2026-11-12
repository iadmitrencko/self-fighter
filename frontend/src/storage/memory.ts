import { exerciseNameKey } from '../domain/catalog/exercise';
import { isCampaignSession, isFightSession, type Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import { computeStatistics } from '../domain/history/statistics';
import { computeGameRecord } from '../domain/kozak/record';
import type {
  ActiveSessionStore,
  AccountUser,
  CurrentUser,
  CustomExercise,
  GameStorage,
  Settings,
  StoredAttempt,
} from './contract';
import { StorageError } from './errors';
import { matches, newestFirst, PAGE_SIZE } from './history';
import { newId } from './ids';

// A Google account as the tests sign in with it.
export interface TestGoogleAccount {
  readonly sub: string;
  readonly name?: string;
  readonly email?: string;
}

export interface MemoryStorage extends GameStorage {
  // For tests only: the person comes back from Google, and the server opens the account (§23.3).
  signIn(account: TestGoogleAccount): void;
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
export function createMemoryStorage(): MemoryStorage {
  const people = new Map<string, Person>();
  // The user of this browser and the guest it keeps beside a signed-in account.
  let current: string | null = null;
  let kept: string | null = null;
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

  function signUp(): Person {
    const found = person();

    if (found !== null) {
      return found;
    }
    const created: Person = {
      user: { id: newId(), kind: 'guest', createdAt: now() },
      google: null,
      exercises: [],
      settings: {},
      attempts: [],
    };
    people.set(created.user.id, created);
    current = created.user.id;

    return created;
  }

  function account(user: CurrentUser, { name, email }: TestGoogleAccount): AccountUser {
    return { id: user.id, kind: 'account', createdAt: user.createdAt, name: name ?? null, email: email ?? null };
  }

  // §23.3: attempts move with their ids, an exercise gives way to one with the same name, the
  // settings of the account stay.
  function join(guest: Person, into: Person): void {
    const taken = new Set(into.exercises.map(({ name }) => exerciseNameKey(name)));
    into.attempts = [...into.attempts, ...guest.attempts];
    into.exercises = [...into.exercises, ...guest.exercises.filter(({ name }) => !taken.has(exerciseNameKey(name)))];
    into.settings = { ...guest.settings, ...into.settings };
    people.delete(guest.user.id);
  }

  const saved = (attempt: Attempt): StoredAttempt => ({ attempt, status: 'saved' });

  return {
    persistent: true,
    signIn(google) {
      const linked = [...people.values()].find((someone) => someone.google === google.sub);
      const browser = person();
      const guest = browser?.user.kind === 'guest' ? browser : null;

      if (linked === undefined && guest !== null) {
        guest.user = account(guest.user, google);
        guest.google = google.sub;
      } else if (linked === undefined) {
        const created: Person = {
          user: account({ id: newId(), kind: 'guest', createdAt: now() }, google),
          google: google.sub,
          exercises: [],
          settings: {},
          attempts: [],
        };
        people.set(created.user.id, created);
        current = created.user.id;
      } else {
        linked.user = account(linked.user, google);

        if (guest !== null && guest.attempts.length + guest.exercises.length > 0) {
          kept = guest.user.id;
        } else if (guest !== null) {
          join(guest, linked);
        }
        current = linked.user.id;
      }
    },
    account: {
      current: () => Promise.resolve(person()?.user ?? null),
      keptGuest() {
        const guest = kept === null ? undefined : people.get(kept);

        return Promise.resolve(
          guest === undefined
            ? null
            : { id: guest.user.id, attempts: guest.attempts.length, exercises: guest.exercises.length },
        );
      },
      joinGuest() {
        const guest = kept === null ? undefined : people.get(kept);
        const into = person();

        if (guest !== undefined && into !== null) {
          join(guest, into);
        }
        kept = null;

        return Promise.resolve();
      },
      signOut() {
        if (person()?.user.kind !== 'account') {
          return Promise.reject(new StorageError('rejected'));
        }
        current = kept;
        kept = null;
        sessions.clear();

        return Promise.resolve();
      },
      deleteData() {
        if (current !== null) {
          people.delete(current);
        }
        // A browser that kept its guest beside the account goes back to it.
        current = kept;
        kept = null;
        sessions.clear();

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
        const owner = signUp();
        const stored = { id: exercise.id, name, description: exercise.description.trim().normalize('NFC') };
        const index = owner.exercises.findIndex(({ id }) => id === exercise.id);
        owner.exercises = index === -1 ? [...owner.exercises, stored] : owner.exercises.with(index, stored);

        return Promise.resolve(stored);
      },
      remove(id) {
        const owner = person();

        if (owner !== null) {
          owner.exercises = owner.exercises.filter((exercise) => exercise.id !== id);
        }

        return Promise.resolve();
      },
    },
    settings: {
      get: (mode) => Promise.resolve(person()?.settings[mode] ?? null),
      save(config) {
        const owner = signUp();
        owner.settings = { ...owner.settings, [config.mode]: config };

        return Promise.resolve();
      },
    },
    attempts: {
      save(attempt) {
        const existing = [...people.values()].flatMap(({ attempts }) => attempts).find(({ id }) => id === attempt.id);

        // A finished attempt never changes (§17.2).
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(attempt)) {
          return Promise.reject(new StorageError('rejected'));
        }
        const owner = signUp();

        if (existing === undefined) {
          owner.attempts = [...owner.attempts, structuredClone(attempt)];
        }

        return Promise.resolve();
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
      game: () => Promise.resolve(computeGameRecord(person()?.attempts ?? [])),
      flush: () => Promise.resolve(),
      // Nothing waits: the memory is the server.
      unsent: () => Promise.resolve(0),
    },
    gameSessions: {
      fight: sessionStore('fight', isFightSession),
      campaign: sessionStore('campaign', isCampaignSession),
    },
  };
}
