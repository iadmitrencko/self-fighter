import type { ExerciseRef } from '../domain/catalog/exercise';
import type { Mode, WorkoutConfig } from '../domain/config/types';
import type { Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import type { Outcome } from '../domain/results/results';

// Screens reach data only through these interfaces (section 3.7 of the plan).

export interface CurrentUser {
  readonly id: string;
  // Sign-in comes later (stage 9), until then every user is a guest of one browser.
  readonly kind: 'guest';
  readonly createdAt: string;
}

export interface CustomExercise extends ExerciseRef {
  readonly description: string;
}

export type Settings = Partial<Record<Mode, WorkoutConfig>>;

// History filters (§14.3). Times are UTC instants: the period includes `from` and excludes `to`.
export interface AttemptFilter {
  readonly mode?: Mode;
  readonly outcome?: Outcome;
  readonly from?: string;
  readonly to?: string;
}

export interface AttemptQuery extends AttemptFilter {
  readonly limit?: number;
  // The `nextCursor` of the previous page.
  readonly cursor?: string;
}

// pending: waits in the browser for the server (§15.4); rejected: the server refused it,
// so sending it again would not help.
export type AttemptStatus = 'saved' | 'pending' | 'rejected';

export interface StoredAttempt {
  readonly attempt: Attempt;
  readonly status: AttemptStatus;
}

export interface AttemptPage {
  readonly items: readonly StoredAttempt[];
  readonly nextCursor: string | null;
}

export interface UserData {
  readonly exportedAt: string;
  readonly user: CurrentUser;
  readonly exercises: readonly CustomExercise[];
  readonly settings: Settings;
  readonly attempts: readonly Attempt[];
}

export interface AccountStore {
  // Reading never creates a user: a guest appears with the first write (§15.1).
  current(): Promise<CurrentUser | null>;
  // null while there is nothing to export.
  exportData(): Promise<UserData | null>;
  // Removes the data on the server and in this browser (§15.5).
  deleteData(): Promise<void>;
}

export interface ExerciseStore {
  list(): Promise<readonly CustomExercise[]>;
  // Creates or changes the exercise with this id and returns it as saved.
  save(exercise: CustomExercise): Promise<CustomExercise>;
  remove(id: string): Promise<void>;
}

// The last configuration of each mode, so the next workout starts from it.
export interface SettingsStore {
  get(mode: Mode): Promise<WorkoutConfig | null>;
  save(config: WorkoutConfig): Promise<void>;
}

export interface AttemptStore {
  // Resolves once the attempt is safe in the browser. It reaches the server in the background.
  save(attempt: Attempt): Promise<void>;
  get(id: string): Promise<StoredAttempt | null>;
  list(query?: AttemptQuery): Promise<AttemptPage>;
  // Counts every attempt the history shows, so the numbers always agree with it (§14.2).
  stats(filter?: AttemptFilter): Promise<Statistics>;
  // Sends the attempts that wait in the browser. The game calls it on start and on a retry.
  flush(): Promise<void>;
}

// The attempt in progress lives in the browser only, so a workout does not need the network.
export interface ActiveSessionStore {
  load(): Session | null;
  save(session: Session): void;
  clear(): void;
}

export interface GameStorage {
  // false when the browser refuses localStorage: an attempt in progress will not survive a reload (§17.2).
  readonly persistent: boolean;
  readonly account: AccountStore;
  readonly exercises: ExerciseStore;
  readonly settings: SettingsStore;
  readonly attempts: AttemptStore;
  readonly activeSession: ActiveSessionStore;
}
