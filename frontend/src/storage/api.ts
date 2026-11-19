import { isFightSession, isJourneySession } from '../domain/engine/session';
import { computeStatistics } from '../domain/history/statistics';
import { addGameRecords, computeGameRecord, EMPTY_RECORD, type GameRecord } from '../domain/kozak/record';
import {
  asAttempt,
  browserLocalStorage,
  createActiveSessionStore,
  createBrowserBuffer,
  createOutbox,
  GAME_SESSION,
  type BrowserBuffer,
  type Owner,
} from './buffer';
import type {
  AccountStore,
  AttemptFilter,
  AttemptPage,
  AttemptQuery,
  AttemptStore,
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
  parseGameRecord,
  parseMe,
  parsePage,
  parseSettings,
  parseStatistics,
  type BrowserState,
} from './payload';

// Attempts that could not be sent are retried from a few seconds up to every five minutes.
const RETRY_FIRST_MS = 5_000;
const RETRY_MAX_MS = 300_000;

const EMPTY_PAGE: AttemptPage = { items: [], nextCursor: null };
const NOBODY: BrowserState = { user: null };

export interface ApiStorageOptions {
  readonly fetch: Fetch;
  readonly buffer: BrowserBuffer;
}

// The storage of the running game: the API of this site and the localStorage of this browser.
export function createBrowserStorage(): GameStorage {
  const buffer = createBrowserBuffer(browserLocalStorage());
  const storage = createApiStorage({ fetch: (path, init) => globalThis.fetch(path, init), buffer });

  // The attempts that waited for the connection go to the server the moment it is back.
  window.addEventListener('online', () => void storage.attempts.flush());

  return storage;
}

export function createApiStorage({ fetch, buffer }: ApiStorageOptions): GameStorage {
  const outbox = createOutbox(buffer);
  const gameSessions = {
    fight: createActiveSessionStore(buffer, `${GAME_SESSION}fight`, isFightSession),
    campaign: createActiveSessionStore(buffer, `${GAME_SESSION}campaign`, isJourneySession),
  };
  // Who used the browser at the last answer.
  let known: BrowserState = NOBODY;
  // Whether the server has answered that at all.
  let answered = false;
  // The account the battles of this page belong to, until it signs out here. An account that has left
  // in another tab still owns the battle in progress, so its attempt waits for it (§23.2).
  let player: Owner | null = null;
  let flushing: Promise<void> | null = null;
  // What the server last said about the game of this user: a battle starts without the network (§15.4).
  let lastGame: GameRecord | null = null;
  let retryDelay = RETRY_FIRST_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const request = (method: string, path: string, body?: unknown): Promise<Reply> =>
    send(fetch, method, path, body);

  const me = cached(async () => settle(parseMe(expectStatus(await request('GET', '/api/v1/me'), 200))));
  // Every module of the server answers for its own data, and the screens ask for it once.
  const exerciseList = cached(() => read([] as readonly CustomExercise[], '/api/v1/exercises', parseExercises));
  const settingsMap = cached(() => read<Settings>({}, '/api/v1/settings', parseSettings));

  // Takes in an answer about who uses the browser. The first answer comes while the first data
  // loads, and that data is already of this account, so only another account starts over.
  function settle(browser: BrowserState): BrowserState {
    if (answered && browser.user?.id !== known.user?.id) {
      exerciseList.clear();
      settingsMap.clear();
      lastGame = null;
    }
    known = browser;
    answered = true;

    if (browser.user !== null) {
      player = { id: browser.user.id };
    }

    return browser;
  }

  function remember(browser: BrowserState): BrowserState {
    me.set(settle(browser));

    return browser;
  }

  // Reads data of the account. Only the screens behind the sign-in ask for it (§23.1).
  async function read<T>(empty: T, path: string, parse: (body: unknown) => T): Promise<T> {
    const reply = await request('GET', path);

    return reply.status === 401 ? forgotten(empty) : parse(expectStatus(reply, 200));
  }

  // The cookie is gone, for example after signing out or deleting the data in another tab.
  function forgotten<T>(empty: T): T {
    remember(NOBODY);

    return empty;
  }

  // Signing out or deleting the data here: the next person on this browser neither continues a
  // battle of the account nor finishes one for it.
  function leave(): void {
    gameSessions.fight.clear();
    gameSessions.campaign.clear();
    player = null;
  }

  // A write needs the account: the server no longer knows it after signing out in another tab (§23.2).
  async function write(method: string, path: string, body?: unknown): Promise<Reply> {
    const reply = await request(method, path, body);

    if (reply.status === 401) {
      forgotten(undefined);
      throw new StorageError('signed-out');
    }

    return reply;
  }

  function waiting(browser: BrowserState, filter: AttemptFilter): StoredAttempt[] {
    return outbox.entries().flatMap(({ document, owner, status }) => {
      const attempt = asAttempt(document);

      return attempt !== null && belongsTo(owner, browser) && matches(attempt, filter)
        ? [{ attempt, status }]
        : [];
    });
  }

  async function sendWaiting(): Promise<void> {
    const queued = outbox.entries().filter(({ status }) => status === 'pending');

    try {
      for (const entry of queued) {
        // An attempt of another account waits until that account is back in this browser.
        if (!belongsTo(entry.owner, await me.get())) {
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
    current: async () => (await me.get()).user,
    async rename(nickname) {
      remember(parseMe(expectStatus(await write('PATCH', '/api/v1/me', { nickname }), 200)));
    },
    async signOut() {
      const reply = await request('POST', '/api/v1/me/logout');

      // 401: the account has left already, for example in another tab.
      if (reply.status !== 401) {
        expectStatus(reply, 204);
      }
      leave();
      remember(NOBODY);
    },
    async deleteData() {
      const browser = await me.get();
      const reply = await request('DELETE', '/api/v1/me');

      if (reply.status !== 401) {
        expectStatus(reply, 204);
      }
      // The attempts that wait in this browser are data of the user as well.
      for (const { attempt } of waiting(browser, {})) {
        outbox.remove(attempt.id);
      }
      leave();
      // The browser forgets the account and asks who it is the next time.
      settle(NOBODY);
      me.clear();
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
    async save(attempt) {
      // The game knows who plays before a battle starts, so this waits for nothing then.
      const owner = player ?? (await me.get()).user;

      if (owner === null) {
        throw new StorageError('signed-out');
      }
      outbox.put({ document: attempt, owner: { id: owner.id }, status: 'pending' });
      void attempts.flush();
    },
    async get(id) {
      // An attempt that waits for the network is found without it.
      const queued = waiting(known, {}).find(({ attempt }) => attempt.id === id);

      if (queued !== undefined) {
        return queued;
      }
      const reply = await request('GET', `/api/v1/attempts/${encodeURIComponent(id)}`);

      return reply.status === 404 || reply.status === 401
        ? null
        : { attempt: parseAttempt(expectStatus(reply, 200)), status: 'saved' };
    },
    async list(query = {}) {
      const browser = await me.get();
      const page = await savedPage(query);

      // Waiting attempts are newer than anything saved, so they belong to the first page only.
      if (query.cursor !== undefined) {
        return page;
      }
      const saved = new Set(page.items.map(({ attempt }) => attempt.id));
      const queued = waiting(browser, query).filter(({ attempt }) => !saved.has(attempt.id));

      return { items: [...queued, ...page.items].sort(newestFirst), nextCursor: page.nextCursor };
    },
    async stats(filter = {}) {
      const browser = await me.get();
      const reply = await request('GET', `/api/v1/stats${search(filter)}`);
      const saved = reply.status === 401 ? forgotten(NO_STATISTICS) : parseStatistics(expectStatus(reply, 200));
      const queued = computeStatistics(waiting(browser, filter).map(({ attempt }) => attempt));

      return addStatistics(saved, queued);
    },
    async game(timeZone) {
      // Without the network the browser is who the server said last, so a battle still ends.
      const browser = await me.get().catch((error: unknown) => {
        if (answered && error instanceof StorageError && error.code === 'offline') {
          return known;
        }
        throw error;
      });
      let saved: GameRecord;

      try {
        const reply = await request('GET', `/api/v1/game?tz=${encodeURIComponent(timeZone)}`);
        saved = reply.status === 401 ? forgotten(EMPTY_RECORD) : parseGameRecord(expectStatus(reply, 200));
        lastGame = saved;
      } catch (error) {
        if (lastGame === null || !(error instanceof StorageError) || error.code !== 'offline') {
          throw error;
        }
        saved = lastGame;
      }
      // A battle finished without the network has spent its energy and won its level already. One
      // the server refused counts for nothing: the server keeps the energy (§24.4).
      const queued = computeGameRecord(
        waiting(browser, {})
          .filter(({ status }) => status === 'pending')
          .map(({ attempt }) => attempt),
        timeZone,
      );

      return addGameRecords(saved, queued);
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
    async unsent() {
      return waiting(await me.get(), {}).filter(({ status }) => status === 'pending').length;
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
    gameSessions,
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

// The attempts of an account wait in the browser for that account, whoever signs in meanwhile (§23.2).
function belongsTo(owner: Owner, { user }: BrowserState): boolean {
  return owner.id === user?.id;
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
