import { exerciseNameKey } from '../../domain/catalog/exercise';
import type { Mode } from '../../domain/config/types';
import type { Attempt } from '../../domain/history/attempt';
import { computeStatistics } from '../../domain/history/statistics';
import type { Outcome } from '../../domain/results/results';
import { isRecord } from '../buffer';
import type { AttemptFilter, CustomExercise, Settings } from '../contract';
import { matches, newestFirst, PAGE_SIZE } from '../history';
import { newId } from '../ids';
import type { Fetch } from '../http';

const MODES: readonly string[] = ['target', 'random-opponent', 'opponent-levels', 'ladder'];

interface Account {
  readonly id: string;
  readonly createdAt: string;
  exercises: CustomExercise[];
  settings: Settings;
  attempts: Attempt[];
}

export interface FakeServer {
  readonly fetch: Fetch;
  // false: every request fails as on a dropped connection.
  online: boolean;
  // The next requests get this status instead of their answers.
  failNext(status: number, times?: number): void;
  // "METHOD /path" of every request that reached the server.
  readonly requests: readonly string[];
  // The browser loses the device cookie, for example when its site data is cleared.
  clearCookie(): void;
  readonly guests: number;
  savedAttempts(): Attempt[];
}

// The API of the backend modules as the browser sees it, kept in memory. The PHPUnit tests check
// the real server against the same rules.
export function createFakeServer(): FakeServer {
  const accounts = new Map<string, Account>();
  const requests: string[] = [];
  const failures: number[] = [];
  let cookie: string | null = null;

  const describe = (account: Account | undefined) => ({
    user: account === undefined ? null : { id: account.id, kind: 'guest', createdAt: account.createdAt },
  });

  function route(method: string, url: URL, body: unknown): Response {
    const account = cookie === null ? undefined : accounts.get(cookie);
    const [resource, id] = url.pathname.replace('/api/v1/', '').split('/');

    if (resource === 'me' && id === undefined && method === 'GET') {
      return reply(200, describe(account));
    }
    if (resource === 'me' && id === undefined && method === 'POST') {
      if (account !== undefined) {
        return reply(200, describe(account));
      }
      const created: Account = {
        id: newId(),
        createdAt: new Date().toISOString(),
        exercises: [],
        settings: {},
        attempts: [],
      };
      accounts.set(created.id, created);
      cookie = created.id;

      return reply(201, describe(created));
    }
    if (account === undefined) {
      return reply(401, { error: 'unauthorized' });
    }

    switch (`${method} ${resource ?? ''}${id === undefined ? '' : '/:id'}`) {
      case 'DELETE me':
        accounts.delete(account.id);
        cookie = null;

        return reply(204);
      case 'GET me/:id':
        return reply(200, {
          exportedAt: new Date().toISOString(),
          ...describe(account),
          exercises: account.exercises,
          settings: account.settings,
          attempts: [...account.attempts].reverse(),
        });
      case 'GET exercises':
        return reply(200, account.exercises);
      case 'PUT exercises/:id':
        return saveExercise(account, id ?? '', body);
      case 'DELETE exercises/:id':
        account.exercises = account.exercises.filter((exercise) => exercise.id !== id);

        return reply(204);
      case 'GET settings':
        return reply(200, account.settings);
      case 'PUT settings/:id':
        if (id === undefined || !MODES.includes(id) || !isRecord(body) || body.mode !== id) {
          return reply(422, { error: 'invalid-settings' });
        }
        account.settings = { ...account.settings, [id as Mode]: body };

        return reply(204);
      case 'GET attempts':
        return listAttempts(account, url.searchParams);
      case 'GET attempts/:id': {
        const attempt = account.attempts.find((item) => item.id === id);

        return attempt === undefined ? reply(404, { error: 'not-found' }) : reply(200, attempt);
      }
      case 'PUT attempts/:id':
        return saveAttempt(account, id ?? '', body);
      case 'GET stats':
        return reply(
          200,
          computeStatistics(account.attempts.filter((attempt) => matches(attempt, filterOf(url.searchParams)))),
        );
      default:
        return reply(404, { error: 'not-found' });
    }
  }

  function saveExercise(account: Account, id: string, body: unknown): Response {
    if (!isRecord(body) || typeof body.name !== 'string' || typeof body.description !== 'string') {
      return reply(422, { error: 'invalid-exercise' });
    }
    const name = body.name.trim();

    if ([...accounts.values()].some((other) => other !== account && other.exercises.some((item) => item.id === id))) {
      return reply(409, { error: 'conflict' });
    }
    if (account.exercises.some((item) => item.id !== id && exerciseNameKey(item.name) === exerciseNameKey(name))) {
      return reply(409, { error: 'exercise-name-taken' });
    }
    const exercise = { id, name, description: body.description.trim() };
    const index = account.exercises.findIndex((item) => item.id === id);
    account.exercises = index === -1 ? [...account.exercises, exercise] : account.exercises.with(index, exercise);

    return reply(index === -1 ? 201 : 200, exercise);
  }

  function saveAttempt(account: Account, id: string, body: unknown): Response {
    if (!isRecord(body) || body.id !== id) {
      return reply(422, { error: 'invalid-attempt' });
    }
    const owner = [...accounts.values()].find((item) => item.attempts.some((attempt) => attempt.id === id));
    const saved = owner?.attempts.find((attempt) => attempt.id === id);

    if (owner === undefined) {
      account.attempts = [...account.attempts, body as unknown as Attempt];

      return reply(201);
    }

    return owner === account && JSON.stringify(saved) === JSON.stringify(body)
      ? reply(204)
      : reply(409, { error: 'conflict' });
  }

  function listAttempts(account: Account, params: URLSearchParams): Response {
    const found = account.attempts
      .filter((attempt) => matches(attempt, filterOf(params)))
      .map((attempt) => ({ attempt, status: 'saved' as const }))
      .sort(newestFirst);
    const cursor = params.get('cursor');
    const start = cursor === null ? 0 : found.findIndex(({ attempt }) => attempt.id === cursor) + 1;
    const limit = Number(params.get('limit') ?? PAGE_SIZE);
    const items = found.slice(start, start + limit).map(({ attempt }) => attempt);

    return reply(200, {
      items,
      nextCursor: start + limit < found.length ? (items.at(-1)?.id ?? null) : null,
    });
  }

  const server: FakeServer = {
    online: true,
    requests,
    failNext(status, times = 1) {
      failures.push(...Array.from({ length: times }, () => status));
    },
    clearCookie() {
      cookie = null;
    },
    get guests() {
      return accounts.size;
    },
    savedAttempts: () => [...accounts.values()].flatMap(({ attempts }) => attempts),
    fetch(path, init) {
      if (!server.online) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      const method = init.method ?? 'GET';
      requests.push(`${method} ${path}`);
      const status = failures.shift();

      if (status !== undefined) {
        return Promise.resolve(reply(status, { error: status >= 500 ? 'server' : 'refused' }));
      }
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : null;

      return Promise.resolve(route(method, new URL(path, 'https://localhost'), body));
    },
  };

  return server;
}

function filterOf(params: URLSearchParams): AttemptFilter {
  return {
    mode: (params.get('mode') ?? undefined) as Mode | undefined,
    outcome: (params.get('outcome') ?? undefined) as Outcome | undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  };
}

function reply(status: number, body?: unknown): Response {
  return body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
