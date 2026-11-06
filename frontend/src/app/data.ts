import { createContext, use } from 'react';

/**
 * Signing out, joining the guest or deleting the data change what every screen shows. A change
 * raises the version, and the screens load their data again.
 */
export interface DataVersion {
  readonly version: number;
  readonly changed: () => void;
}

export const DataVersionContext = createContext<DataVersion>({ version: 0, changed: () => undefined });

export function useDataVersion(): DataVersion {
  return use(DataVersionContext);
}
