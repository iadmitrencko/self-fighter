import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import { isRecord } from './buffer';
import type { AttemptPage, CurrentUser, CustomExercise, Settings, StoredEvent, UserData } from './contract';
import { StorageError } from './errors';

// The shapes the server sends (backend/src/*/Application/*View.php). Any other shape is a server failure.

export function parseMe(body: unknown): CurrentUser | null {
  if (!isRecord(body)) {
    throw unexpected();
  }

  return body.user === null ? null : parseUser(body.user);
}

export function parseExercises(body: unknown): CustomExercise[] {
  if (!Array.isArray(body)) {
    throw unexpected();
  }

  return body.map(parseExercise);
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

// The server checked every configuration against the schema when it was saved.
export function parseSettings(body: unknown): Settings {
  if (!isRecord(body)) {
    throw unexpected();
  }

  return body;
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
    typeof body.losses !== 'number' ||
    !Array.isArray(body.challenges) ||
    !body.challenges.every((slug) => typeof slug === 'string')
  ) {
    throw unexpected();
  }

  return {
    total: body.total,
    wins: body.wins,
    draws: body.draws,
    losses: body.losses,
    challenges: body.challenges,
  };
}

// The export joins what every module of the server keeps about the user.
export function parseUserData(body: unknown): UserData {
  if (
    !isRecord(body) ||
    typeof body.exportedAt !== 'string' ||
    !Array.isArray(body.attempts) ||
    !Array.isArray(body.events)
  ) {
    throw unexpected();
  }

  return {
    exportedAt: body.exportedAt,
    user: parseUser(body.user),
    exercises: parseExercises(body.exercises),
    settings: parseSettings(body.settings),
    attempts: body.attempts.map(parseAttempt),
    events: body.events.map(parseEvent),
  };
}

function parseEvent(value: unknown): StoredEvent {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.mode !== 'string' ||
    typeof value.occurredAt !== 'string'
  ) {
    throw unexpected();
  }

  return {
    name: value.name,
    mode: value.mode,
    ...(typeof value.outcome === 'string' ? { outcome: value.outcome } : {}),
    ...(typeof value.error === 'string' ? { error: value.error } : {}),
    occurredAt: value.occurredAt,
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
