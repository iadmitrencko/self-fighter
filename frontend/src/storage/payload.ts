import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import { isRecord } from './buffer';
import type { AttemptPage, CurrentUser, CustomExercise, Settings, UserData } from './contract';
import { StorageError } from './errors';

// The shapes the server sends (backend/src/Api/Payload.php). Any other shape is a server failure.

export interface Me {
  readonly user: CurrentUser | null;
  exercises: readonly CustomExercise[];
  settings: Settings;
}

export function parseMe(body: unknown): Me {
  if (!isRecord(body) || !Array.isArray(body.exercises) || !isRecord(body.settings)) {
    throw unexpected();
  }

  return {
    user: body.user === null ? null : parseUser(body.user),
    exercises: body.exercises.map(parseExercise),
    // The server checked every configuration against the schema when it was saved.
    settings: body.settings,
  };
}

export function parseExercise(value: unknown): CustomExercise {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string'
  ) {
    throw unexpected();
  }

  return { id: value.id, name: value.name, description: value.description };
}

// The server checked every attempt against the schema before it saved it.
export function parseAttempt(value: unknown): Attempt {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.finishedAt !== 'string') {
    throw unexpected();
  }

  return value as unknown as Attempt;
}

export function parsePage(body: unknown): AttemptPage {
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    (body.nextCursor !== null && typeof body.nextCursor !== 'string')
  ) {
    throw unexpected();
  }

  return {
    items: body.items.map((item) => ({ attempt: parseAttempt(item), status: 'saved' as const })),
    nextCursor: body.nextCursor,
  };
}

export function parseStatistics(body: unknown): Statistics {
  if (
    !isRecord(body) ||
    typeof body.total !== 'number' ||
    typeof body.wins !== 'number' ||
    typeof body.draws !== 'number' ||
    typeof body.losses !== 'number'
  ) {
    throw unexpected();
  }

  return { total: body.total, wins: body.wins, draws: body.draws, losses: body.losses };
}

export function parseUserData(body: unknown): UserData {
  const { user, exercises, settings } = parseMe(body);

  if (!isRecord(body) || user === null || typeof body.exportedAt !== 'string' || !Array.isArray(body.attempts)) {
    throw unexpected();
  }

  return {
    exportedAt: body.exportedAt,
    user,
    exercises,
    settings,
    attempts: body.attempts.map(parseAttempt),
  };
}

function parseUser(value: unknown): CurrentUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.kind !== 'guest' ||
    typeof value.createdAt !== 'string'
  ) {
    throw unexpected();
  }

  return { id: value.id, kind: value.kind, createdAt: value.createdAt };
}

function unexpected(): StorageError {
  return new StorageError('server');
}
