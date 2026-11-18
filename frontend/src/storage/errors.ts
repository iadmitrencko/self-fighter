// Screens show these codes as messages from src/i18n.
export type StorageErrorCode =
  // The request did not reach the server.
  | 'offline'
  // The server failed or answered something unexpected.
  | 'server'
  | 'rate-limited'
  // The server refused the data, so repeating the request will not help.
  | 'rejected'
  // The browser has no account any more: it signed out in another tab, or the data was deleted (§23.2).
  | 'signed-out'
  | 'exercise-name-taken';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, options?: ErrorOptions) {
    super(`Storage failed: ${code}`, options);
    this.name = 'StorageError';
    this.code = code;
  }
}
