import { useState, type ReactNode } from 'react';
import { accountTexts } from '../../i18n/uk';
import type { StorageErrorCode } from '../../storage/errors';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { errorCode } from '../useLoad';
import { ConfirmDialog } from './Dialog';

export interface SignOut {
  readonly start: () => void;
  readonly busy: boolean;
  // The question about the attempts that still wait, while it is asked.
  readonly dialog: ReactNode;
}

/**
 * §15.4, §23.2: signing out gives the waiting attempts one more try to reach the server, and those
 * still waiting are named before the person decides. The settings and the menu of the player sign
 * out the same way; `onDone` tells what happened, and every screen loads its data again.
 */
export function useSignOut({ onDone, onFailure }: { onDone: (message: string) => void; onFailure: (error: StorageErrorCode) => void }): SignOut {
  const { storage } = useGame();
  const { changed } = useDataVersion();
  const [unsent, setUnsent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);

    try {
      await action();
    } catch (error) {
      setUnsent(null);
      onFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await storage.account.signOut();
    setUnsent(null);
    changed();
    onDone(accountTexts.signedOut);
  }

  const start = () =>
    void run(async () => {
      await storage.attempts.flush();
      const waiting = await storage.attempts.unsent();

      if (waiting > 0) {
        setUnsent(waiting);

        return;
      }
      await signOut();
    });

  return {
    start,
    busy,
    dialog:
      unsent === null ? null : (
        <ConfirmDialog
          title={accountTexts.signOutTitle}
          text={accountTexts.signOutUnsent(unsent)}
          confirm={accountTexts.signOut}
          tone="primary"
          busy={busy}
          onConfirm={() => void run(signOut)}
          onCancel={() => setUnsent(null)}
        />
      ),
  };
}
