import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { validationMessages } from '../i18n/uk';
import { createApiAnalytics, type Fetch } from './api';
import type { AnalyticsEvent } from './events';

// The server keeps only the events this file allows (stage 8 of the plan).
const ajv = new Ajv({ allErrors: true });
// Vitest runs in frontend/, and Docker Compose mounts the schema next to it.
const validate = ajv.compile(JSON.parse(readFileSync(resolve('../backend/schema/event.schema.json'), 'utf8')) as object);

const EVENTS: readonly AnalyticsEvent[] = [
  { name: 'workout_started', mode: 'target' },
  { name: 'workout_repeated', mode: 'random-opponent' },
  { name: 'workout_completed', mode: 'opponent-levels', outcome: 'draw' },
  { name: 'workout_completed', mode: 'ladder', outcome: 'win' },
  { name: 'setup_error', mode: 'ladder', error: 'ladder-max-invalid' },
];

function sent(fetch: Mock<Fetch>): unknown[] {
  return fetch.mock.calls.map(([, init]) => (typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : init.body));
}

describe('the events of the game', () => {
  it.each(EVENTS)('fit the format of the server: $name', (event) => {
    expect(validate(event)).toBe(true);
  });

  it('name every setup error in a form the server accepts', () => {
    for (const error of Object.keys(validationMessages)) {
      expect(validate({ name: 'setup_error', mode: 'target', error }), error).toBe(true);
    }
  });

  it.each([
    { name: 'workout_started', mode: 'target', outcome: 'win' },
    { name: 'workout_completed', mode: 'target' },
    { name: 'workout_started', mode: 'boxing' },
    { name: 'page_viewed', mode: 'target' },
    { name: 'workout_started', mode: 'target', userId: '019a3b2c-1d2e-7f30-8a41-b52c63d74e85' },
    { name: 'setup_error', mode: 'target', error: 'Target required' },
  ])('carry nothing the server refuses: %o', (event) => {
    expect(validate(event)).toBe(false);
  });
});

describe('sending the events', () => {
  // §22: before the choice and after a refusal nothing leaves the browser.
  it('sends nothing without consent', () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(null, { status: 204 })));
    const analytics = createApiAnalytics({ allowed: () => false, fetch });

    analytics.track({ name: 'workout_started', mode: 'target' });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends each event to the API of the site once allowed', () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(null, { status: 204 })));
    const analytics = createApiAnalytics({ allowed: () => true, fetch });

    analytics.track({ name: 'workout_completed', mode: 'ladder', outcome: 'loss' });

    expect(fetch).toHaveBeenCalledWith('/api/v1/events', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(sent(fetch)).toEqual([{ name: 'workout_completed', mode: 'ladder', outcome: 'loss' }]);
  });

  it('asks before every event, so a changed decision counts at once', () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(null, { status: 204 })));
    let allowed = true;
    const analytics = createApiAnalytics({ allowed: () => allowed, fetch });

    analytics.track({ name: 'workout_started', mode: 'target' });
    allowed = false;
    analytics.track({ name: 'workout_repeated', mode: 'target' });

    expect(sent(fetch)).toEqual([{ name: 'workout_started', mode: 'target' }]);
  });

  // A lost event must not touch the game.
  it('ignores a failed request', async () => {
    const failure = Promise.reject(new TypeError('Failed to fetch'));
    const fetch = vi.fn<Fetch>(() => failure);
    const analytics = createApiAnalytics({ allowed: () => true, fetch });

    expect(() => analytics.track({ name: 'workout_started', mode: 'target' })).not.toThrow();
    await expect(failure).rejects.toThrow('Failed to fetch');
  });
});
