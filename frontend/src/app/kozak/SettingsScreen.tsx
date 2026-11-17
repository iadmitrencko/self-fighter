import { useCallback, useId, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { settingsTexts } from '../../i18n/kozak';
import { accountTexts, commonTexts, signInTexts } from '../../i18n/uk';
import { NICKNAME_MAX, type AccountUser, type CurrentUser, type KeptGuest } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { ConfirmDialog } from '../components/Dialog';
import { Title } from '../components/Screen';
import { SignInWithGoogle, useCanSignIn } from '../components/SignIn';
import { useSignOut } from '../components/SignOut';
import { ErrorNotice } from '../components/notices';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { isWorthJoining } from '../signIn';
import { errorCode, useLoad } from '../useLoad';
import { KozakScreen } from './parts';

/**
 * §15.5, §23, §24.1, §24.11: the data of the player as a section of the game. Every player, a guest
 * too, names the cossack and can delete the data; a guest can sign in, an account can sign out and
 * take in the guest this browser kept beside it.
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
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const signOut = useSignOut({ onDone: setMessage, onFailure: setFailure });
  // The menu of the player signs out on any screen and comes here to say so (GameHeader.tsx).
  const arrived = noticeOf(useLocation().state);
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
      setConfirming(false);
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  const startSignOut = () => {
    setFailure(null);
    setMessage(null);
    signOut.start();
  };

  const rename = (nickname: string | null) =>
    act(async () => {
      await storage.account.rename(nickname);

      return nickname === null ? settingsTexts.nameCleared : settingsTexts.nameSaved;
    });

  const join = () =>
    act(async () => {
      await storage.account.joinGuest();

      return signInTexts.joined;
    });

  const remove = () =>
    act(async () => {
      await storage.account.deleteData();
      setConfirming(false);

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
        {message ?? arrived ?? (browser.status === 'ready' && user === null ? accountTexts.nothing : '')}
      </p>
      {browser.status === 'ready' && (
        <div className="k-settings">
          <CossackNameCard user={user} busy={busy} onSave={(nickname) => void rename(nickname)} />
          {account !== null && <AccountCard account={account} busy={busy || signOut.busy} onSignOut={startSignOut} />}
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
              <button type="button" className="k-button k-button--danger" disabled={busy} onClick={() => setConfirming(true)}>
                {accountTexts.delete}
              </button>
            </Setting>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={accountTexts.deleteQuestion}
          text={account === null ? accountTexts.deleteWarning : accountTexts.accountDeleteWarning}
          confirm={accountTexts.deleteConfirm}
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        />
      )}
      {signOut.dialog}
    </KozakScreen>
  );
}

function noticeOf(state: unknown): string | null {
  return typeof state === 'object' && state !== null && 'notice' in state && typeof state.notice === 'string' ? state.notice : null;
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

// §24.11: the name the player gives the cossack, a guest too; without it an account carries the
// name Google gave. An empty field takes the name away.
function CossackNameCard({
  user,
  busy,
  onSave,
}: {
  user: CurrentUser | null;
  busy: boolean;
  onSave: (nickname: string | null) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState(user?.nickname ?? '');
  const google = user?.kind === 'account' ? user.name : null;

  return (
    <Setting title={settingsTexts.nameTitle}>
      <form
        className="k-name"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value.trim() === '' ? null : value);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor={inputId}>
            {settingsTexts.nameLabel}
          </label>
          <input
            id={inputId}
            className="input"
            value={value}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            spellCheck={false}
            placeholder={settingsTexts.namePlaceholder}
            aria-describedby={hintId}
            onChange={(event) => setValue(event.target.value)}
          />
          <p id={hintId} className="hint">
            {google === null ? settingsTexts.nameText : `${settingsTexts.nameText} ${settingsTexts.nameFallback(google)}`}
          </p>
        </div>
        <button type="submit" className="k-button k-button--secondary" disabled={busy}>
          {settingsTexts.nameSave}
        </button>
      </form>
    </Setting>
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
