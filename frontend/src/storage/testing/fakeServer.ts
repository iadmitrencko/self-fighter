import { exerciseNameKey } from '../../domain/catalog/exercise';
import type { Mode } from '../../domain/config/types';
import type { Attempt } from '../../domain/history/attempt';
import { computeStatistics } from '../../domain/history/statistics';
import { computeGameRecord } from '../../domain/kozak/record';
import type { Outcome } from '../../domain/results/results';
import { isRecord } from '../buffer';
import type { AttemptFilter, CustomExercise, Settings } from '../contract';
import { matches, newestFirst, PAGE_SIZE } from '../history';
import { newId } from '../ids';
import type { Fetch } from '../http';
import type { TestGoogleAccount } from '../memory';

const MODES: readonly string[] = ['target', 'random-opponent', 'opponent-levels', 'ladder'];

interface User {
  readonly id: string;
  readonly createdAt: string;
  // The Google account of an account; a guest has none.
  subject: string | null;
  name: string | null;
  email: string | null;
  exercises: CustomExercise[];
  settings: Settings;
  attempts: Attempt[];
}

// What the device cookie of the browser leads to (section 3.7 of the plan).
interface Device {
  user: string;
  guest: string | null;
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
  // The person comes back from Google, and the server opens the account on this browser (§23.3).
  signIn(account: TestGoogleAccount): void;
  // The number of users, guests and accounts.
  readonly guests: number;
  savedAttempts(): Attempt[];
}

// The API of the backend modules as the browser sees it, kept in memory. The PHPUnit tests check
// the real server against the same rules.
export function createFakeServer(): FakeServer {
  const users = new Map<string, User>();
  const requests: string[] = [];
  const failures: number[] = [];
  let device: Device | null = null;

  const describeUser = (user: User) =>
    user.subject === null
      ? { id: user.id, kind: 'guest', createdAt: user.createdAt }
      : { id: user.id, kind: 'account', createdAt: user.createdAt, name: user.name, email: user.email };

  function describe() {
    const user = device === null ? undefined : users.get(device.user);
    const guest = device?.guest === null || device === null ? undefined : users.get(device.guest);

    return {
      user: user === undefined ? null : describeUser(user),
      guest:
        guest === undefined
          ? null
          : { id: guest.id, attempts: guest.attempts.length, exercises: guest.exercises.length },
    };
  }

  function createUser(): User {
    const user: User = {
      id: newId(),
      createdAt: new Date().toISOString(),
      subject: null,
      name: null,
      email: null,
      exercises: [],
      settings: {},
      attempts: [],
    };
    users.set(user.id, user);

    return user;
  }

  // §23.3: attempts keep their ids, exercises with a name the account has give way, the account keeps its settings.
  function join(guest: User, account: User): void {
    const taken = new Set(account.exercises.map(({ name }) => exerciseNameKey(name)));
    account.attempts = [...account.attempts, ...guest.attempts];
    account.exercises = [...account.exercises, ...guest.exercises.filter(({ name }) => !taken.has(exerciseNameKey(name)))];
    account.settings = { ...guest.settings, ...account.settings };
    users.delete(guest.id);
  }

  // The browser goes back to the guest it kept, or to no user.
  function fallBack(): void {
    device = device?.guest === null || device === null ? null : { user: device.guest, guest: null };
  }

  function route(method: string, url: URL, body: unknown): Response {
    const user = device === null ? undefined : users.get(device.user);
    const [resource, id] = url.pathname.replace('/api/v1/', '').split('/');

    if (resource === 'me' && id === undefined && method === 'GET') {
      return reply(200, describe());
    }
    if (resource === 'me' && id === undefined && method === 'POST') {
      if (user !== undefined) {
        return reply(200, describe());
      }
      device = { user: createUser().id, guest: null };

      return reply(201, describe());
    }
    if (user === undefined) {
      return reply(401, { error: 'unauthorized' });
    }

    // The actions of the user keep their names, records go by their ids.
    const path = id === undefined ? (resource ?? '') : `${resource ?? ''}/${resource === 'me' ? id : ':id'}`;

    switch (`${method} ${path}`) {
      case 'DELETE me':
        users.delete(user.id);
        fallBack();

        return reply(204);
      case 'POST me/logout':
        if (user.subject === null) {
          return reply(409, { error: 'not-signed-in' });
        }
        fallBack();

        return reply(200, describe());
      case 'POST me/merge': {
        const guest = device?.guest === null || device === null ? undefined : users.get(device.guest);

        if (guest !== undefined) {
          join(guest, user);
        }
        device = { user: user.id, guest: null };

        return reply(200, describe());
      }
      case 'GET me/export':
        return reply(200, {
          exportedAt: new Date().toISOString(),
          user: describeUser(user),
          identities: user.subject === null ? [] : [{ provider: 'google', subject: user.subject, createdAt: user.createdAt }],
          exercises: user.exercises,
          settings: user.settings,
          attempts: [...user.attempts].reverse(),
          events: [],
        });
      case 'GET exercises':
        return reply(200, user.exercises);
      case 'PUT exercises/:id':
        return saveExercise(user, id ?? '', body);
      case 'DELETE exercises/:id':
        user.exercises = user.exercises.filter((exercise) => exercise.id !== id);

        return reply(204);
      case 'GET settings':
        return reply(200, user.settings);
      case 'PUT settings/:id':
        if (id === undefined || !MODES.includes(id) || !isRecord(body) || body.mode !== id) {
          return reply(422, { error: 'invalid-settings' });
        }
        user.settings = { ...user.settings, [id as Mode]: body };

        return reply(204);
      case 'GET attempts':
        return listAttempts(user, url.searchParams);
      case 'GET attempts/:id': {
        const attempt = user.attempts.find((item) => item.id === id);

        return attempt === undefined ? reply(404, { error: 'not-found' }) : reply(200, attempt);
      }
      case 'PUT attempts/:id':
        return saveAttempt(user, id ?? '', body);
      case 'GET stats':
        return reply(
          200,
          computeStatistics(user.attempts.filter((attempt) => matches(attempt, filterOf(url.searchParams)))),
        );
      case 'GET game':
        return reply(200, computeGameRecord(user.attempts));
      default:
        return reply(404, { error: 'not-found' });
    }
  }

  function saveExercise(user: User, id: string, body: unknown): Response {
    if (!isRecord(body) || typeof body.name !== 'string' || typeof body.description !== 'string') {
      return reply(422, { error: 'invalid-exercise' });
    }
    const name = body.name.trim();

    if ([...users.values()].some((other) => other !== user && other.exercises.some((item) => item.id === id))) {
      return reply(409, { error: 'conflict' });
    }
    if (user.exercises.some((item) => item.id !== id && exerciseNameKey(item.name) === exerciseNameKey(name))) {
      return reply(409, { error: 'exercise-name-taken' });
    }
    const exercise = { id, name, description: body.description.trim() };
    const index = user.exercises.findIndex((item) => item.id === id);
    user.exercises = index === -1 ? [...user.exercises, exercise] : user.exercises.with(index, exercise);

    return reply(index === -1 ? 201 : 200, exercise);
  }

  function saveAttempt(user: User, id: string, body: unknown): Response {
    if (!isRecord(body) || body.id !== id) {
      return reply(422, { error: 'invalid-attempt' });
    }
    const owner = [...users.values()].find((item) => item.attempts.some((attempt) => attempt.id === id));
    const saved = owner?.attempts.find((attempt) => attempt.id === id);

    if (owner === undefined) {
      user.attempts = [...user.attempts, body as unknown as Attempt];

      return reply(201);
    }

    return owner === user && JSON.stringify(saved) === JSON.stringify(body)
      ? reply(204)
      : reply(409, { error: 'conflict' });
  }

  function listAttempts(user: User, params: URLSearchParams): Response {
    const found = user.attempts
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
      device = null;
    },
    // The rules of backend/src/Account/Application/SignIn.php.
    signIn({ sub, name = null, email = null }) {
      const linked = [...users.values()].find(({ subject }) => subject === sub);
      const current = device === null ? undefined : users.get(device.user);
      const guest = current?.subject === null ? current : undefined;

      if (linked === undefined && guest !== undefined) {
        Object.assign(guest, { subject: sub, name, email });
        device = { user: guest.id, guest: null };
      } else if (linked === undefined) {
        const created = Object.assign(createUser(), { subject: sub, name, email });
        device = { user: created.id, guest: device?.guest ?? null };
      } else {
        Object.assign(linked, { name, email });

        if (guest !== undefined && guest.attempts.length + guest.exercises.length > 0) {
          device = { user: linked.id, guest: guest.id };
        } else {
          if (guest !== undefined) {
            join(guest, linked);
          }
          device = { user: linked.id, guest: guest === undefined ? (device?.guest ?? null) : null };
        }
      }
    },
    get guests() {
      return users.size;
    },
    savedAttempts: () => [...users.values()].flatMap(({ attempts }) => attempts),
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
