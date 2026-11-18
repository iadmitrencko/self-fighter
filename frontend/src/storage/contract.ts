import type { ExerciseRef } from '../domain/catalog/exercise';
import type { FightConfig } from '../domain/config/types';
import type { FightSession, JourneySession, Session } from '../domain/engine/session';
import type { Attempt } from '../domain/history/attempt';
import type { Statistics } from '../domain/history/statistics';
import type { EnergyPool } from '../domain/kozak/energy';
import type { GameRecord } from '../domain/kozak/record';
import type { Outcome } from '../domain/results/results';

// Screens reach data only through these interfaces (section 3.7 of the plan).

// §24.11: the longest name the player may give the cossack.
export const NICKNAME_MAX = 40;

// The account of the player. The game needs one: signing in with Google opens it on any browser (§23.1).
export interface CurrentUser {
  readonly id: string;
  readonly createdAt: string;
  // §24.11: the name the player gave the cossack.
  readonly nickname: string | null;
  // What Google told about the person, so the screen shows whose account is open.
  readonly name: string | null;
  readonly email: string | null;
}

export interface CustomExercise extends ExerciseRef {
  readonly description: string;
}

// §6: the last fight of the player, so the next one starts from it. The journey sets its levels itself.
export interface Settings {
  readonly fight?: FightConfig;
}

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

export interface AccountStore {
  // null until the person signs in with Google: the game needs an account (§23.1).
  current(): Promise<CurrentUser | null>;
  // §24.11: the name the player gives the cossack; null or an empty one takes it away.
  rename(nickname: string | null): Promise<void>;
  // §23.2: the browser forgets the account. Its attempts that still wait here stay until the
  // account signs in on this browser again.
  signOut(): Promise<void>;
  // Removes the data on the server and in this browser, and the browser forgets the account (§15.5).
  deleteData(): Promise<void>;
}

export interface ExerciseStore {
  list(): Promise<readonly CustomExercise[]>;
  // Creates or changes the exercise with this id and returns it as saved.
  save(exercise: CustomExercise): Promise<CustomExercise>;
  remove(id: string): Promise<void>;
}

// The last fight of the player, so the next one starts from it (§6).
export interface SettingsStore {
  get(mode: 'fight'): Promise<FightConfig | null>;
  save(config: FightConfig): Promise<void>;
}

export interface AttemptStore {
  // Resolves once the attempt is safe in the browser. It reaches the server in the background.
  save(attempt: Attempt): Promise<void>;
  get(id: string): Promise<StoredAttempt | null>;
  list(query?: AttemptQuery): Promise<AttemptPage>;
  // Counts every attempt the history shows, so the numbers always agree with it (§14.2).
  stats(filter?: AttemptFilter): Promise<Statistics>;
  // §24: what the attempts of the game add up to, the attempts that wait in the browser included.
  // Its days go by the calendar of the player in this time zone of the IANA database (§24.12).
  game(timeZone: string): Promise<GameRecord>;
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
  readonly fight: ActiveSessionStore<FightSession>;
  // A level of the journey or a battle of the duel with the King: both take the energy of the journey.
  readonly campaign: ActiveSessionStore<JourneySession>;
}

export interface GameStorage {
  // false when the browser refuses localStorage: an attempt in progress will not survive a reload (§17.2).
  readonly persistent: boolean;
  readonly account: AccountStore;
  readonly exercises: ExerciseStore;
  readonly settings: SettingsStore;
  readonly attempts: AttemptStore;
  // The battles of the game in progress, one for each pool of energy (§24.4): a fight and a level
  // of the journey wait apart from each other.
  readonly gameSessions: GameSessions;
}
