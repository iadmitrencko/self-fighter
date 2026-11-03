import type { Analytics, AnalyticsEvent } from './events';

export interface RecordedAnalytics extends Analytics {
  readonly events: readonly AnalyticsEvent[];
}

// Keeps the events in memory, so tests of the screens see what the game reports.
export function createMemoryAnalytics(): RecordedAnalytics {
  const events: AnalyticsEvent[] = [];

  return {
    events,
    track(event) {
      events.push(event);
    },
  };
}
