import { isRecord } from './buffer';
import { StorageError } from './errors';

// A request that hangs on a weak signal counts as no connection.
const TIMEOUT_MS = 15_000;

export type Fetch = (path: string, init: RequestInit) => Promise<Response>;

export interface Reply {
  readonly status: number;
  readonly body: unknown;
}

export async function send(
  fetch: Fetch,
  method: string,
  path: string,
  body?: unknown,
): Promise<Reply> {
  try {
    const response = await fetch(path, {
      method,
      // The device cookie tells the server who the user is. The browser adds Origin to writes itself.
      credentials: 'same-origin',
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
      signal: timeout(),
    });
    const text = await response.text();

    return { status: response.status, body: text === '' ? null : parseJson(text) };
  } catch (error) {
    // fetch() rejects only when the connection failed, so the server may not have seen the request.
    throw new StorageError('offline', { cause: error });
  }
}

// Turns an answer the operation does not expect into an error the screens can show.
export function failure(reply: Reply): StorageError {
  if (isRecord(reply.body) && reply.body.error === 'exercise-name-taken') {
    return new StorageError('exercise-name-taken');
  }
  if (reply.status === 429) {
    return new StorageError('rate-limited');
  }

  return new StorageError(reply.status >= 500 ? 'server' : 'rejected');
}

export function expectStatus(reply: Reply, ...statuses: number[]): unknown {
  if (!statuses.includes(reply.status)) {
    throw failure(reply);
  }

  return reply.body;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A proxy may answer with an HTML error page.
    return null;
  }
}

function timeout(): AbortSignal | null {
  // Safari learned AbortSignal.timeout() only in version 16.
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : null;
}
