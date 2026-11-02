import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { newId } from './ids';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  // The server accepts only UUID v7 (backend/schema/attempt.schema.json).
  it('creates a UUID v7', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 48 - 1 }), fc.uint8Array({ minLength: 10, maxLength: 10 }), (now, random) => {
        expect(newId(now, random)).toMatch(UUID_V7);
      }),
    );
  });

  it('starts with the time in milliseconds', () => {
    expect(newId(0x0123_4567_89ab, new Uint8Array(10))).toBe('01234567-89ab-7000-8000-000000000000');
  });

  // New records go to the end of the database index.
  it('sorts ids of later records after earlier ones', () => {
    expect(newId(Date.parse('2026-11-02T10:00:00.001Z')) > newId(Date.parse('2026-11-02T10:00:00.000Z'))).toBe(true);
  });

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));

    expect(ids.size).toBe(1000);
  });
});
