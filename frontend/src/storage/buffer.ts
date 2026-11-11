import { SCHEMA_VERSION, type Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import type { ActiveSessionStore, AttemptStatus, CurrentUser } from './contract';

// The browser keeps only what lives for minutes: the attempt in progress and the attempts that
// wait for the network. It is not a store, so nothing here is ever migrated (section 3.5 of the plan).

const PREFIX = 'self-fighter:';
const PROBE = `${PREFIX}probe`;
// The workout of /workout in progress. §24.1: that section is gone, so the game drops what it left.
export const SITE_SESSION = `${PREFIX}active-session`;
// The battles of the game in progress, one for each pool of energy (§24.4).
export const GAME_SESSION = `${PREFIX}game-session:`;
const OUTBOX = `${PREFIX}outbox:`;

export interface BrowserBuffer {
  readonly persistent: boolean;
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
  keys(prefix: string): string[];
}

export function browserLocalStorage(): Storage | null {
  try {
    // Reading the property throws when the browser blocks site data.
    return window.localStorage;
  } catch {
    return null;
  }
}

// localStorage may be missing, blocked or full. Values that it refuses stay in memory for this page.
export function createBrowserBuffer(storage: Storage | null): BrowserBuffer {
  const memory = new Map<string, string>();
  // Some private modes refuse every write, so the buffer tries one before relying on it.
  let persistent = storage !== null && quietly(() => store(storage, PROBE, ''), false);
  quietly(() => storage?.removeItem(PROBE), undefined);

  return {
    get persistent() {
      return persistent;
    },
    read: (key) => memory.get(key) ?? quietly(() => storage?.getItem(key) ?? null, null),
    write(key, value) {
      if (persistent && storage !== null && quietly(() => store(storage, key, value), false)) {
        memory.delete(key);

        return;
      }
      // A full or blocked localStorage keeps the game going in memory, with a warning (§17.2).
      persistent = false;
      memory.set(key, value);
    },
    remove(key) {
      memory.delete(key);
      quietly(() => storage?.removeItem(key), undefined);
    },
    keys(prefix) {
      const stored = quietly(
        () => Array.from({ length: storage?.length ?? 0 }, (_, index) => storage?.key(index)),
        [],
      );

      return [...new Set([...stored, ...memory.keys()])].filter(
        (key): key is string => key?.startsWith(prefix) ?? false,
      );
    },
  };
}

function quietly<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function store(storage: Storage, key: string, value: string): true {
  storage.setItem(key, value);

  return true;
}

// Each store keeps one kind of session: a level of the journey never opens as a workout.
export function createActiveSessionStore<TSession extends Session>(
  buffer: BrowserBuffer,
  key: string,
  kind: (session: Session) => session is TSession,
): ActiveSessionStore<TSession> {
  return {
    load() {
      const session = parse(buffer.read(key));

      if (isCurrentSession(session) && kind(session)) {
        return session;
      }
      // A release changed the format. An unfinished attempt does not count anyway (§12.4).
      buffer.remove(key);

      return null;
    },
    save: (session) => buffer.write(key, JSON.stringify(session)),
    clear: () => buffer.remove(key),
  };
}

// The user who finished the attempt, or null when the browser had no user yet.
export type Owner = Pick<CurrentUser, 'id' | 'kind'> | null;

// Exactly what goes to the server. A previous release may have written another format version:
// the server accepts it as is, so the browser never converts it (section 3.7 of the plan).
export interface QueuedDocument {
  readonly id: string;
  readonly schemaVersion: number;
  readonly finishedAt: string;
}

export interface OutboxEntry {
  readonly document: QueuedDocument;
  readonly owner: Owner;
  readonly status: Exclude<AttemptStatus, 'saved'>;
}

export interface Outbox {
  put(entry: OutboxEntry): void;
  remove(id: string): void;
  // Oldest first, so attempts reach the server in the order they finished.
  entries(): OutboxEntry[];
}

// One key per attempt: tabs that queue attempts at the same time never overwrite each other.
export function createOutbox(buffer: BrowserBuffer): Outbox {
  return {
    put: (entry) => buffer.write(`${OUTBOX}${entry.document.id}`, JSON.stringify(entry)),
    remove: (id) => buffer.remove(`${OUTBOX}${id}`),
    entries: () =>
      buffer
        .keys(OUTBOX)
        .map((key) => parse(buffer.read(key)))
        .filter(isOutboxEntry)
        .sort((a, b) => a.document.finishedAt.localeCompare(b.document.finishedAt)),
  };
}

// Only an attempt of the current format can be shown. An older one is still sent as it is.
export function asAttempt(document: QueuedDocument): Attempt | null {
  return document.schemaVersion === SCHEMA_VERSION ? (document as unknown as Attempt) : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parse(text: string | null): unknown {
  try {
    return text === null ? null : (JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

function isCurrentSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    value.schemaVersion === SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    Array.isArray(value.stages)
  );
}

function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (!isRecord(value) || !isRecord(value.document)) {
    return false;
  }
  const { document, owner, status } = value;

  return (
    typeof document.id === 'string' &&
    typeof document.schemaVersion === 'number' &&
    typeof document.finishedAt === 'string' &&
    (owner === null ||
      (isRecord(owner) && typeof owner.id === 'string' && (owner.kind === 'guest' || owner.kind === 'account'))) &&
    (status === 'pending' || status === 'rejected')
  );
}
