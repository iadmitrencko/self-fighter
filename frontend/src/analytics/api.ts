import type { Analytics } from './events';

export type Fetch = (path: string, init: RequestInit) => Promise<Response>;

export interface ApiAnalyticsOptions {
  // Asked before every event, so a changed decision counts at once (§22).
  readonly allowed: () => boolean;
  readonly fetch: Fetch;
}

// The events go to the API of this site, never to another service.
export function createApiAnalytics({ allowed, fetch }: ApiAnalyticsOptions): Analytics {
  return {
    track(event) {
      if (!allowed()) {
        return;
      }
      // The device cookie names the user. keepalive lets the last event of a page arrive after it closes.
      fetch('/api/v1/events', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => undefined);
    },
  };
}
