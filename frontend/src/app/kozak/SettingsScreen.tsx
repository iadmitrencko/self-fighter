import { useCallback, useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { settingsTexts } from '../../i18n/kozak';
import { accountTexts, commonTexts } from '../../i18n/uk';
import { NICKNAME_MAX, type CurrentUser } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { ConfirmDialog } from '../components/Dialog';
import { Title } from '../components/Screen';
import { useSignOut } from '../components/SignOut';
import { ErrorNotice } from '../components/notices';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import { errorCode, useLoad } from '../useLoad';
import { kozakPaths } from './paths';
import { KozakScreen } from './parts';

/**
 * §15.5, §23, §24.1, §24.11: the data of the player as a section of the game: the name of the
 * cossack, the account with signing out, and deleting the data. Signing out and deleting leave the
 * browser without an account, so the way in says what they did (§23.1).
 */
export function SettingsScreen() {
  const { storage } = useGame();
  const { changed } = useDataVersion();
  const navigate = useNavigate();
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [account, reload] = useLoad(loadUser);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const leave = (notice: string) => void navigate(kozakPaths.cossack, { state: { notice } });
  const signOut = useSignOut({ onDone: leave, onFailure: setFailure });

  // Runs an action of the screen; a finished one says what it did, and the screens load again.
  async function act(action: () => Promise<string>) {
    setBusy(true);
    setFailure(null);
    setMessage(null);

    try {
      setMessage(await action());
      changed();
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

  async function remove() {
    setBusy(true);
    setFailure(null);

    try {
      await storage.account.deleteData();
      changed();
      leave(accountTexts.deleted);
    } catch (error) {
      setConfirming(false);
      setFailure(errorCode(error));
      setBusy(false);
    }
  }

  return (
    <KozakScreen title={settingsTexts.title} className="k-settings-screen">
      <header className="k-head">
        <Title className="k-title">{settingsTexts.title}</Title>
        <p className="k-lead">{accountTexts.intro}</p>
      </header>
      {account.status === 'loading' && (
        <p className="k-loading" role="status">
          {commonTexts.loading}
        </p>
      )}
      {account.status === 'failed' && <ErrorNotice error={account.error} onRetry={reload} />}
      {failure !== null && <ErrorNotice error={failure} />}
      <p className="k-settings__status" role="status">
        {message ?? ''}
      </p>
      {account.status === 'ready' && account.value !== null && (
        <div className="k-settings">
          <CossackNameCard user={account.value} busy={busy} onSave={(nickname) => void rename(nickname)} />
          <AccountCard account={account.value} busy={busy || signOut.busy} onSignOut={startSignOut} />
          <Setting title={accountTexts.deleteTitle}>
            <p className="k-card__text">{accountTexts.deleteText}</p>
            <button type="button" className="k-button k-button--danger" disabled={busy} onClick={() => setConfirming(true)}>
              {accountTexts.delete}
            </button>
          </Setting>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={accountTexts.deleteQuestion}
          text={accountTexts.deleteWarning}
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

function Setting({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className="k-card k-setting" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-setting__title">
        {title}
      </h2>
      {children}
    </section>
  );
}

// §24.11: the name the player gives the cossack; without it the cossack carries the name Google
// gave. An empty field takes the name away.
function CossackNameCard({
  user,
  busy,
  onSave,
}: {
  user: CurrentUser;
  busy: boolean;
  onSave: (nickname: string | null) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState(user.nickname ?? '');
  const google = user.name;

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
function AccountCard({ account, busy, onSignOut }: { account: CurrentUser; busy: boolean; onSignOut: () => void }) {
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
