import { useCallback, useId, useState, type ReactNode } from 'react';
import { accountTexts, signInTexts } from '../../i18n/uk';
import type { AccountUser, KeptGuest, UserData } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { ConfirmDialog } from '../components/Dialog';
import { BACK, Screen, ScreenHead } from '../components/Screen';
import { SignInWithGoogle, useCanSignIn } from '../components/SignIn';
import { ErrorNotice, Loading } from '../components/notices';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { isWorthJoining } from '../signIn';
import { errorCode, useLoad } from '../useLoad';

// §15.5, §23: every user, a guest too, can download the data and delete it; a guest can sign in,
// an account can sign out and take in the guest this browser kept beside it.
export function AccountScreen() {
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

  const download = () =>
    act(async () => {
      const data = await storage.account.exportData();

      if (data === null) {
        return accountTexts.nothing;
      }
      saveFile(data);

      return null;
    });

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
    <Screen title={accountTexts.title}>
      <ScreenHead back={BACK.modes} title={accountTexts.title} />
      <p className="lead">{account === null ? accountTexts.intro : accountTexts.accountIntro}</p>
      {browser.status === 'loading' && <Loading />}
      {browser.status === 'failed' && <ErrorNotice error={browser.error} onRetry={reload} />}
      {failure !== null && <ErrorNotice error={failure} />}
      <p className="account-status" role="status">
        {message ?? (browser.status === 'ready' && user === null ? accountTexts.nothing : '')}
      </p>
      {browser.status === 'ready' && (
        <div className="account-sections">
          {account !== null && <AccountCard account={account} busy={busy} onSignOut={() => void startSignOut()} />}
          {account === null && canSignIn && (
            <Section title={accountTexts.signInTitle}>
              <p>{accountTexts.signInText}</p>
              <SignInWithGoogle />
            </Section>
          )}
          {isWorthJoining(guest) && <KeptGuestCard guest={guest} busy={busy} onJoin={() => void join()} />}
          {user !== null && (
            <>
              <Section title={accountTexts.exportTitle}>
                <p>{accountTexts.exportText}</p>
                <button type="button" className="button button--outline button--large" disabled={busy} onClick={() => void download()}>
                  {accountTexts.export}
                </button>
              </Section>
              <Section title={accountTexts.deleteTitle}>
                <p>{account === null ? accountTexts.deleteText : accountTexts.accountDeleteText}</p>
                <button type="button" className="button button--danger button--large" disabled={busy} onClick={() => setConfirming('delete')}>
                  {accountTexts.delete}
                </button>
              </Section>
            </>
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
    </Screen>
  );
}

function Section({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className={`card account-section ${className}`.trim()} aria-labelledby={titleId}>
      <h2 id={titleId} className="account-section__title">
        {title}
      </h2>
      {children}
    </section>
  );
}

// §23.1: the person sees whose account is open, by the name and the email Google gave.
function AccountCard({ account, busy, onSignOut }: { account: AccountUser; busy: boolean; onSignOut: () => void }) {
  return (
    <Section title={accountTexts.accountTitle}>
      {(account.name !== null || account.email !== null) && (
        <p className="account-identity">
          {account.name !== null && <span className="account-identity__name">{account.name}</span>}
          {account.email !== null && <span className="account-identity__email">{account.email}</span>}
        </p>
      )}
      <button type="button" className="button button--outline button--large" disabled={busy} onClick={onSignOut}>
        {accountTexts.signOut}
      </button>
    </Section>
  );
}

// §23.3: what this browser saved without signing in waits for the person to take it into the account.
function KeptGuestCard({ guest, busy, onJoin }: { guest: KeptGuest; busy: boolean; onJoin: () => void }) {
  return (
    <Section title={accountTexts.keptTitle} className="account-section--kept">
      <p>{accountTexts.keptText(guest.attempts, guest.exercises)}</p>
      <button type="button" className="button button--primary" disabled={busy} onClick={onJoin}>
        {accountTexts.join}
      </button>
    </Section>
  );
}

function saveFile(data: UserData) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = accountTexts.fileName;
  link.click();
  // Safari starts the download after the click returns, so the file stays available a moment longer.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
