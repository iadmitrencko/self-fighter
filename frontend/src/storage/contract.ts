import type { ExerciseRef } from '../domain/catalog/exercise';
import type { Mode, WorkoutConfig } from '../domain/config/types';
import type { CampaignSession, Session, WorkoutSession } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import type { EnergyPool } from '../domain/kozak/energy';
import type { GameRecord } from '../domain/kozak/record';
import type { Outcome } from '../domain/results/results';

// Screens reach data only through these interfaces (section 3.7 of the plan).

// A guest is a user of one browser. An account signs in with Google and opens on any browser (§23.1).
export type CurrentUser = GuestUser | AccountUser;

export interface GuestUser {
  readonly id: string;
  readonly kind: 'guest';
  readonly createdAt: string;
}

export interface AccountUser {
  readonly id: string;
  readonly kind: 'account';
  readonly createdAt: string;
  // What Google told about the person, so the screen shows whose account is open.
  readonly name: string | null;
  readonly email: string | null;
}

// The guest of this browser that a signed-in account has not taken in: its data waits until the
// person joins it to the account or signs out (§23.3).
export interface KeptGuest {
  readonly id: string;
  readonly attempts: number;
  readonly exercises: number;
}

// A way to sign in as the export shows it: the id of the Google account is data about the person too.
export interface SignInIdentity {
  readonly provider: string;
  readonly subject: string;
  readonly createdAt: string;
}

export interface CustomExercise extends ExerciseRef {
  readonly description: string;
}

export type Settings = Partial<Record<Mode, WorkoutConfig>>;

// History filters (§14.3). Times are UTC instants: the period includes `from` and excludes `to`.
// The levels of the journey (§24.5) have a mode of their own.
export interface AttemptFilter {
  readonly mode?: Attempt['mode'];
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

// An event of analytics as the server keeps it, sent only with consent (§22).
export interface StoredEvent {
  readonly name: string;
  readonly mode: string;
  readonly outcome?: string;
  readonly error?: string;
  readonly occurredAt: string;
}

export interface UserData {
  readonly exportedAt: string;
  readonly user: CurrentUser;
  readonly identities: readonly SignInIdentity[];
  readonly exercises: readonly CustomExercise[];
  readonly settings: Settings;
  readonly attempts: readonly Attempt[];
  readonly events: readonly StoredEvent[];
}

export interface AccountStore {
  // Reading never creates a user: a guest appears with the first write (§15.1).
  current(): Promise<CurrentUser | null>;
  // The guest this browser keeps beside the signed-in account, with what it would bring (§23.3).
  keptGuest(): Promise<KeptGuest | null>;
  // §23.3: the kept guest joins the account. Asking again changes nothing.
  joinGuest(): Promise<void>;
  // §23.2: the browser goes back to its guest or to no user. Attempts of the account that still
  // wait here stay until the account signs in on this browser again.
  signOut(): Promise<void>;
  // null while there is nothing to export.
  exportData(): Promise<UserData | null>;
  // Removes the data on the server and in this browser (§15.5). A browser that kept its guest
  // beside the account goes back to that guest.
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
  // §24: what the attempts of the game add up to, the attempts that wait in the browser included.
  game(): Promise<GameRecord>;
  // Sends the attempts that wait in the browser. The game calls it on start and on a retry.
  flush(): Promise<void>;
  // How many attempts of the user still wait in this browser for the server (§15.4).
  unsent(): Promise<number>;
}

// The attempt in progress lives in the browser only, so a workout does not need the network.
export interface ActiveSessionStore<TSession extends Session = Session> {
  load(): TSession | null;
  save(session: TSession): void;
  clear(): void;
}

export interface GameSessions extends Readonly<Record<EnergyPool, ActiveSessionStore>> {
  readonly fight: ActiveSessionStore<WorkoutSession>;
  readonly campaign: ActiveSessionStore<CampaignSession>;
}

export interface GameStorage {
  // false when the browser refuses localStorage: an attempt in progress will not survive a reload (§17.2).
  readonly persistent: boolean;
  readonly account: AccountStore;
  readonly exercises: ExerciseStore;
  readonly settings: SettingsStore;
  readonly attempts: AttemptStore;
  // The workout of the site in progress.
  readonly activeSession: ActiveSessionStore<WorkoutSession>;
  // The battles of the game in progress, one for each pool of energy (§24.4): a fight and a level
  // of the journey wait apart from each other and from the workout of the site.
  readonly gameSessions: GameSessions;
}
