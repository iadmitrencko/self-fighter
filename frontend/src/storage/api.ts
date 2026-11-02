import { computeStatistics } from '../domain/history/statistics';
import {
  asAttempt,
  browserLocalStorage,
  createActiveSessionStore,
  createBrowserBuffer,
  createOutbox,
  type BrowserBuffer,
  type Owner,
} from './buffer';
import type {
  AccountStore,
  AttemptFilter,
  AttemptPage,
  AttemptQuery,
  AttemptStore,
  CurrentUser,
  CustomExercise,
  ExerciseStore,
  GameStorage,
  Settings,
  SettingsStore,
  StoredAttempt,
} from './contract';
import { StorageError } from './errors';
import { addStatistics, matches, newestFirst, NO_STATISTICS } from './history';
import { expectStatus, failure, send, type Fetch, type Reply } from './http';
import {
  parseAttempt,
  parseExercise,
  parseExercises,
  parseMe,
  parsePage,
  parseSettings,
  parseStatistics,
  parseUserData,
} from './payload';

// Attempts that could not be sent are retried from a few seconds up to every five minutes.
const RETRY_FIRST_MS = 5_000;
const RETRY_MAX_MS = 300_000;

const EMPTY_PAGE: AttemptPage = { items: [], nextCursor: null };

export interface ApiStorageOptions {
  readonly fetch: Fetch;
  readonly buffer: BrowserBuffer;
}

// The storage of the running game: the API of this site and the localStorage of this browser.
export function createBrowserStorage(): GameStorage {
  const storage = createApiStorage({
    fetch: (path, init) => globalThis.fetch(path, init),
    buffer: createBrowserBuffer(browserLocalStorage()),
  });

  // The attempts that waited for the connection go to the server the moment it is back.
  window.addEventListener('online', () => void storage.attempts.flush());

  return storage;
}

export function createApiStorage({ fetch, buffer }: ApiStorageOptions): GameStorage {
  const outbox = createOutbox(buffer);
  const activeSession = createActiveSessionStore(buffer);
  // The user of the last answer, so an attempt finished without a connection still has an owner.
  let knownUser: CurrentUser | null = null;
  let newGuest: Promise<CurrentUser> | null = null;
  let flushing: Promise<void> | null = null;
  let retryDelay = RETRY_FIRST_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const request = (method: string, path: string, body?: unknown): Promise<Reply> =>
    send(fetch, method, path, body);

  const me = cached(async () => parseMe(expectStatus(await request('GET', '/api/v1/me'), 200)));
  // Every module of the server answers for its own data, and the screens ask for it once.
  const exerciseList = cached(() =>
    ofUser([] as readonly CustomExercise[], '/api/v1/exercises', parseExercises),
  );
  const settingsMap = cached(() => ofUser<Settings>({}, '/api/v1/settings', parseSettings));

  function remember(user: CurrentUser | null): CurrentUser | null {
    if (user?.id !== knownUser?.id) {
      exerciseList.clear();
      settingsMap.clear();
    }
    knownUser = user;
    me.set(user);

    return user;
  }

  // A browser without a user has no data yet, so it asks for none.
  async function ofUser<T>(empty: T, path: string, parse: (body: unknown) => T): Promise<T> {
    if ((await me.get()) === null) {
      return empty;
    }
    const reply = await request('GET', path);

    return reply.status === 401 ? forgotten(empty) : parse(expectStatus(reply, 200));
  }

  // The cookie is gone, for example after the data was deleted in another tab.
  function forgotten<T>(empty: T): T {
    remember(null);

    return empty;
  }

  // A guest appears with the first write of the browser (§15.1). The lock keeps two tabs
  // from creating two guests at the same moment.
  async function ensureUser(): Promise<CurrentUser> {
    const current = await me.get();

    if (current !== null) {
      return current;
    }
    newGuest ??= withLock('self-fighter:new-guest', async () => {
      // Another tab may have created the guest while this one waited for the lock.
      me.clear();
      const created = await me.get();

      return (
        created ??
        userOf(remember(parseMe(expectStatus(await request('POST', '/api/v1/me'), 200, 201))))
      );
    }).finally(() => {
      newGuest = null;
    });

    return newGuest;
  }

  // When the server no longer knows the cookie, the browser starts over as a new guest once.
  async function write(method: string, path: string, body?: unknown): Promise<Reply> {
    await ensureUser();
    const reply = await request(method, path, body);

    if (reply.status !== 401) {
      return reply;
    }
    me.clear();
    await ensureUser();

    return request(method, path, body);
  }

  function waiting(user: CurrentUser | null, filter: AttemptFilter): StoredAttempt[] {
    return outbox.entries().flatMap(({ document, owner, status }) => {
      const attempt = asAttempt(document);

      return attempt !== null && belongsTo(owner, user) && matches(attempt, filter)
        ? [{ attempt, status }]
        : [];
    });
  }

  async function sendWaiting(): Promise<void> {
    const queued = outbox.entries().filter(({ status }) => status === 'pending');

    try {
      for (const entry of queued) {
        const user = await ensureUser();

        // An attempt of another user waits until that user is back in this browser.
        if (!belongsTo(entry.owner, user)) {
          continue;
        }
        const reply = await write('PUT', `/api/v1/attempts/${entry.document.id}`, entry.document);

        if (reply.status === 201 || reply.status === 204) {
          outbox.remove(entry.document.id);
        } else if (failure(reply).code === 'rejected') {
          outbox.put({ ...entry, status: 'rejected' });
        } else {
          throw failure(reply);
        }
      }
      retryDelay = RETRY_FIRST_MS;
    } catch {
      // No connection or a busy server: try again later, and less often each time.
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void attempts.flush(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }
  }

  async function savedPage(query: AttemptQuery): Promise<AttemptPage> {
    const reply = await request('GET', `/api/v1/attempts${search(query)}`);

    return reply.status === 401 ? forgotten(EMPTY_PAGE) : parsePage(expectStatus(reply, 200));
  }

  const account: AccountStore = {
    current: () => me.get(),
    async exportData() {
      if ((await me.get()) === null) {
        return null;
      }
      const reply = await request('GET', '/api/v1/me/export');

      return reply.status === 401 ? forgotten(null) : parseUserData(expectStatus(reply, 200));
    },
    async deleteData() {
      const user = await me.get();

      if (user !== null) {
        const reply = await request('DELETE', '/api/v1/me');

        if (reply.status !== 401) {
          expectStatus(reply, 204);
        }
      }
      // The attempts that wait in this browser are data of the user as well.
      for (const { attempt } of waiting(user, {})) {
        outbox.remove(attempt.id);
      }
      activeSession.clear();
      forgotten(undefined);
    },
  };

  const exercises: ExerciseStore = {
    list: () => exerciseList.get(),
    async save({ id, name, description }) {
      const reply = await write('PUT', `/api/v1/exercises/${id}`, { name, description });
      const saved = parseExercise(expectStatus(reply, 200, 201));
      exerciseList.update((list) => {
        const index = list.findIndex((exercise) => exercise.id === saved.id);

        return index === -1 ? [...list, saved] : list.with(index, saved);
      });

      return saved;
    },
    async remove(id) {
      // A browser without a user has nothing to delete, and deleting must not create a guest.
      if ((await me.get()) === null) {
        return;
      }
      expectStatus(await write('DELETE', `/api/v1/exercises/${id}`), 204);
      exerciseList.update((list) => list.filter((exercise) => exercise.id !== id));
    },
  };

  const settings: SettingsStore = {
    async get(mode) {
      return (await settingsMap.get())[mode] ?? null;
    },
    async save(config) {
      expectStatus(await write('PUT', `/api/v1/settings/${config.mode}`, config), 204);
      settingsMap.update((map) => ({ ...map, [config.mode]: config }));
    },
  };

  const attempts: AttemptStore = {
    save(attempt) {
      outbox.put({ document: attempt, owner: ownerOf(knownUser), status: 'pending' });
      void attempts.flush();

      return Promise.resolve();
    },
    async get(id) {
      // An attempt that waits for the network is found without it.
      const queued = waiting(knownUser, {}).find(({ attempt }) => attempt.id === id);

      if (queued !== undefined || (await me.get()) === null) {
        return queued ?? null;
      }
      const reply = await request('GET', `/api/v1/attempts/${encodeURIComponent(id)}`);

      return reply.status === 404 || reply.status === 401
        ? null
        : { attempt: parseAttempt(expectStatus(reply, 200)), status: 'saved' };
    },
    async list(query = {}) {
      const user = await me.get();
      const page = user === null ? EMPTY_PAGE : await savedPage(query);

      // Waiting attempts are newer than anything saved, so they belong to the first page only.
      if (query.cursor !== undefined) {
        return page;
      }
      const saved = new Set(page.items.map(({ attempt }) => attempt.id));
      const queued = waiting(user, query).filter(({ attempt }) => !saved.has(attempt.id));

      return { items: [...queued, ...page.items].sort(newestFirst), nextCursor: page.nextCursor };
    },
    async stats(filter = {}) {
      const user = await me.get();
      let saved = NO_STATISTICS;

      if (user !== null) {
        const reply = await request('GET', `/api/v1/stats${search(filter)}`);
        saved =
          reply.status === 401 ? forgotten(NO_STATISTICS) : parseStatistics(expectStatus(reply, 200));
      }
      const queued = computeStatistics(waiting(user, filter).map(({ attempt }) => attempt));

      return addStatistics(saved, queued);
    },
    // A run that has already started may miss attempts queued after it, so runs follow one another.
    flush() {
      const run = (flushing ?? Promise.resolve()).then(sendWaiting);
      flushing = run;
      void run.finally(() => {
        if (flushing === run) {
          flushing = null;
        }
      });

      return run;
    },
  };

  return {
    get persistent() {
      return buffer.persistent;
    },
    account,
    exercises,
    settings,
    attempts,
    activeSession,
  };
}

interface Cached<T> {
  get(): Promise<T>;
  set(value: T): void;
  // Changes the value once it is loaded. An unloaded value comes fresh from the server anyway.
  update(change: (value: T) => T): void;
  clear(): void;
}

// One request for a resource at a time. A failure is not remembered, so the next call asks again.
function cached<T>(load: () => Promise<T>): Cached<T> {
  let value: Promise<T> | null = null;

  function hold(next: Promise<T>): Promise<T> {
    value = next;
    next.catch(() => {
      if (value === next) {
        value = null;
      }
    });

    return next;
  }

  return {
    get: () => value ?? hold(load()),
    set(next) {
      value = Promise.resolve(next);
    },
    update(change) {
      if (value !== null) {
        void hold(value.then(change));
      }
    },
    clear() {
      value = null;
    },
  };
}

// A browser has one guest at a time, so the attempts of a guest it lost belong to the next one.
function belongsTo(owner: Owner, user: CurrentUser | null): boolean {
  return (
    owner === null ||
    owner.id === user?.id ||
    (owner.kind === 'guest' && (user === null || user.kind === 'guest'))
  );
}

function ownerOf(user: CurrentUser | null): Owner {
  return user === null ? null : { id: user.id, kind: user.kind };
}

function userOf(user: CurrentUser | null): CurrentUser {
  if (user === null) {
    throw new StorageError('server');
  }

  return user;
}

function search(query: AttemptQuery): string {
  const values: Record<string, string | number | undefined> = { ...query };
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  }
  const text = params.toString();

  return text === '' ? '' : `?${text}`;
}

// Web Locks coordinate the tabs of one browser. Without them each tab is on its own.
async function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  return 'locks' in navigator ? await navigator.locks.request(name, task) : task();
}
