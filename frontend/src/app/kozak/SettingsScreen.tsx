import { useCallback, useId, useState, type ReactNode } from 'react';
import { settingsTexts } from '../../i18n/kozak';
import { accountTexts, commonTexts, signInTexts } from '../../i18n/uk';
import type { AccountUser, KeptGuest } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { ConfirmDialog } from '../components/Dialog';
import { Title } from '../components/Screen';
import { SignInWithGoogle, useCanSignIn } from '../components/SignIn';
import { ErrorNotice } from '../components/notices';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { isWorthJoining } from '../signIn';
import { errorCode, useLoad } from '../useLoad';
import { KozakScreen } from './parts';

/**
 * §15.5, §23, §24.1: the data of the player as a section of the game. Every user, a guest too, can
 * delete the data; a guest can sign in, an account can sign out and take in the guest this
 * browser kept beside it.
 */
export function SettingsScreen() {
  const { storage } = useGame();
  const { changed } = useDataVersion();
  const canSignIn = useCanSignIn();
  const load = useCallback(async () => {
    const user = await storage.account.current();

    return { user, guest: user?.kind === 'account' ? await storage.account.keptGuest() : null };
  }, [storage]);
  const [browser, reload] = useLoad(load);
  const [confirming, setConfirming] = useState<'delete' | 'sign-out' | null>(null);
  const [unsent, setUnsent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const user = browser.status === 'ready' ? browser.value.user : null;
  const account = user?.kind === 'account' ? user : null;
  const guest = browser.status === 'ready' ? browser.value.guest : null;

  // Runs an action of the screen; a finished one says what it did, and the screens load again.
  async function act(action: () => Promise<string | null>) {
    setBusy(true);
    setFailure(null);
    setMessage(null);

    try {
      const done = await action();

      if (done !== null) {
        setMessage(done);
        changed();
      }
    } catch (error) {
      setConfirming(null);
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  // §15.4: before signing out the waiting attempts get one more try, and those left are named.
  const startSignOut = () =>
    act(async () => {
      await storage.attempts.flush();
      const waiting = await storage.attempts.unsent();

      if (waiting > 0) {
        setUnsent(waiting);
        setConfirming('sign-out');

        return null;
      }

      return signOut();
    });

  async function signOut() {
    await storage.account.signOut();
    setConfirming(null);

    return accountTexts.signedOut;
  }

  const join = () =>
    act(async () => {
      await storage.account.joinGuest();

      return signInTexts.joined;
    });

  const remove = () =>
    act(async () => {
      await storage.account.deleteData();
      setConfirming(null);

      return accountTexts.deleted;
    });

  return (
    <KozakScreen title={settingsTexts.title} className="k-settings-screen">
      <header className="k-head">
        <Title className="k-title">{settingsTexts.title}</Title>
        <p className="k-lead">{account === null ? accountTexts.intro : accountTexts.accountIntro}</p>
      </header>
      {browser.status === 'loading' && (
        <p className="k-loading" role="status">
          {commonTexts.loading}
        </p>
      )}
      {browser.status === 'failed' && <ErrorNotice error={browser.error} onRetry={reload} />}
      {failure !== null && <ErrorNotice error={failure} />}
      <p className="k-settings__status" role="status">
        {message ?? (browser.status === 'ready' && user === null ? accountTexts.nothing : '')}
      </p>
      {browser.status === 'ready' && (
        <div className="k-settings">
          {account !== null && <AccountCard account={account} busy={busy} onSignOut={() => void startSignOut()} />}
          {account === null && canSignIn && (
            <Setting title={accountTexts.signInTitle}>
              <p className="k-card__text">{accountTexts.signInText}</p>
              <SignInWithGoogle />
            </Setting>
          )}
          {isWorthJoining(guest) && <KeptGuestCard guest={guest} busy={busy} onJoin={() => void join()} />}
          {user !== null && (
            <Setting title={accountTexts.deleteTitle}>
              <p className="k-card__text">{account === null ? accountTexts.deleteText : accountTexts.accountDeleteText}</p>
              <button type="button" className="k-button k-button--danger" disabled={busy} onClick={() => setConfirming('delete')}>
                {accountTexts.delete}
              </button>
            </Setting>
          )}
        </div>
      )}
      {confirming === 'delete' && (
        <ConfirmDialog
          title={accountTexts.deleteQuestion}
          text={account === null ? accountTexts.deleteWarning : accountTexts.accountDeleteWarning}
          confirm={accountTexts.deleteConfirm}
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'sign-out' && (
        <ConfirmDialog
          title={accountTexts.signOutTitle}
          text={accountTexts.signOutUnsent(unsent)}
          confirm={accountTexts.signOut}
          tone="primary"
          busy={busy}
          onConfirm={() => void act(signOut)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </KozakScreen>
  );
}

function Setting({ title, active = false, children }: { title: string; active?: boolean; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className={active ? 'k-card k-card--active k-setting' : 'k-card k-setting'} aria-labelledby={titleId}>
      <h2 id={titleId} className="k-setting__title">
        {title}
      </h2>
      {children}
    </section>
  );
}

// §23.1: the person sees whose account is open, by the name and the email Google gave.
function AccountCard({ account, busy, onSignOut }: { account: AccountUser; busy: boolean; onSignOut: () => void }) {
  return (
    <Setting title={accountTexts.accountTitle}>
      {(account.name !== null || account.email !== null) && (
        <p className="k-identity">
          {account.name !== null && <span className="k-identity__name">{account.name}</span>}{' '}
          {account.email !== null && <span className="k-identity__email">{account.email}</span>}
        </p>
      )}
      <button type="button" className="k-button k-button--secondary" disabled={busy} onClick={onSignOut}>
        {accountTexts.signOut}
      </button>
    </Setting>
  );
}

// §23.3: what this browser saved without signing in waits for the person to take it into the account.
function KeptGuestCard({ guest, busy, onJoin }: { guest: KeptGuest; busy: boolean; onJoin: () => void }) {
  return (
    <Setting title={accountTexts.keptTitle} active>
      <p className="k-card__text">{accountTexts.keptText(guest.attempts, guest.exercises)}</p>
      <button type="button" className="k-button k-button--primary" disabled={busy} onClick={onJoin}>
        {accountTexts.join}
      </button>
    </Setting>
  );
}
