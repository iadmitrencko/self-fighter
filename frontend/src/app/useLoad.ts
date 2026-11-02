import { useCallback, useEffect, useState } from 'react';
import { StorageError, type StorageErrorCode } from '../storage/errors';

export type Load<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'failed'; readonly error: StorageErrorCode };

interface Done<T> {
  readonly run: number;
  readonly result: Load<T>;
}

/**
 * Loads data for a screen. `load` must be stable (useCallback): a new function loads again.
 * A repeated load keeps showing the previous value until the new one arrives.
 */
export function useLoad<T>(load: () => Promise<T>): [Load<T>, reload: () => void] {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState<Done<T> | null>(null);

  useEffect(() => {
    let active = true;

    load().then(
      (value) => {
        if (active) {
          setDone({ run, result: { status: 'ready', value } });
        }
      },
      (error: unknown) => {
        if (active) {
          setDone({ run, result: { status: 'failed', error: errorCode(error) } });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [load, run]);

  const reload = useCallback(() => setRun((value) => value + 1), []);

  return [done?.result ?? { status: 'loading' }, reload];
}

export function errorCode(error: unknown): StorageErrorCode {
  return error instanceof StorageError ? error.code : 'server';
}
