import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import type { GameRecord, Tally } from '../domain/kozak/record';
import { isRecord } from './buffer';
import type {
  AttemptPage,
  CurrentUser,
  CustomExercise,
  KeptGuest,
  Settings,
} from './contract';
import { StorageError } from './errors';

// The shapes the server sends (backend/src/*/Application/*View.php). Any other shape is a server failure.

// Who uses this browser: its user and the guest it keeps beside a signed-in account (§23.3).
export interface BrowserState {
  readonly user: CurrentUser | null;
  readonly guest: KeptGuest | null;
}

export function parseMe(body: unknown): BrowserState {
  if (!isRecord(body)) {
    throw unexpected();
  }

  return {
    user: body.user === null ? null : parseUser(body.user),
    guest: body.guest === null || body.guest === undefined ? null : parseKeptGuest(body.guest),
  };
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
    typeof body.losses !== 'number'
  ) {
    throw unexpected();
  }

  return {
    total: body.total,
    wins: body.wins,
    draws: body.draws,
    losses: body.losses,
  };
}

// §24: the record of the game as the server counts it from the attempts it keeps.
export function parseGameRecord(body: unknown): GameRecord {
  if (
    !isRecord(body) ||
    !Array.isArray(body.passed) ||
    !body.passed.every((level) => typeof level === 'string') ||
    !isRecord(body.energy) ||
    !isOptionalText(body.energy.fight) ||
    !isOptionalText(body.energy.campaign) ||
    !isOptionalText(body.duelAt)
  ) {
    throw unexpected();
  }

  return {
    fights: parseTally(body.fights),
    campaign: parseTally(body.campaign),
    passed: body.passed,
    energy: { fight: body.energy.fight, campaign: body.energy.campaign },
    best: parseBest(body.best),
    duel: parseDuel(body.duel),
    duelAt: body.duelAt,
  };
}

// §24.9: the places of the sets of the duel done, by the round.
function parseDuel(value: unknown): Readonly<Record<string, readonly number[]>> {
  if (!isRecord(value)) {
    throw unexpected();
  }

  return Object.fromEntries(
    Object.entries(value).map(([round, places]) => {
      if (!Array.isArray(places) || !places.every(isCount)) {
        throw unexpected();
      }

      return [round, places];
    }),
  );
}

// §24.8: the best set of every exercise of the journey, by its id.
function parseBest(value: unknown): Readonly<Record<string, number>> {
  if (!isRecord(value)) {
    throw unexpected();
  }

  return Object.fromEntries(
    Object.entries(value).map(([exercise, reps]) => {
      if (!isCount(reps)) {
        throw unexpected();
      }

      return [exercise, reps];
    }),
  );
}

function parseTally(value: unknown): Tally {
  if (!isRecord(value) || !isCount(value.wins) || !isCount(value.draws) || !isCount(value.losses)) {
    throw unexpected();
  }

  return { wins: value.wins, draws: value.draws, losses: value.losses };
}

function parseUser(value: unknown): CurrentUser {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'string') {
    throw unexpected();
  }
  if (value.kind === 'guest') {
    return { id: value.id, kind: 'guest', createdAt: value.createdAt };
  }
  if (value.kind !== 'account' || !isOptionalText(value.name) || !isOptionalText(value.email)) {
    throw unexpected();
  }

  return { id: value.id, kind: 'account', createdAt: value.createdAt, name: value.name, email: value.email };
}

function parseKeptGuest(value: unknown): KeptGuest {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isCount(value.attempts) ||
    !isCount(value.exercises)
  ) {
    throw unexpected();
  }

  return { id: value.id, attempts: value.attempts, exercises: value.exercises };
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function unexpected(): StorageError {
  return new StorageError('server');
}
