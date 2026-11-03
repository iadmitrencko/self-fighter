import type { Mode } from '../domain/config/types';
import type { ConfigErrorCode } from '../domain/config/validation';
import type { Outcome } from '../domain/results/results';

// The events of §19 with nothing but the fields backend/schema/event.schema.json allows. The
// server adds the time and the user, so the browser sends neither.
export type AnalyticsEvent =
  // workout_started comes with every start, a repeated one too.
  | { readonly name: 'workout_started' | 'workout_repeated'; readonly mode: Mode }
  | { readonly name: 'workout_completed'; readonly mode: Mode; readonly outcome: Outcome }
  | { readonly name: 'setup_error'; readonly mode: Mode; readonly error: ConfigErrorCode };

// Screens report what the player did through this interface; main.tsx chooses its implementation.
export interface Analytics {
  // Sends the event if the visitor allowed analytics (§22). It never fails and never waits:
  // a lost event must not touch the game.
  track(event: AnalyticsEvent): void;
}
