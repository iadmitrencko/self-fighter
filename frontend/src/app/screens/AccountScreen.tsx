import { useCallback, useId, useState } from 'react';
import { accountTexts } from '../../i18n/uk';
import type { UserData } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { ConfirmDialog } from '../components/Dialog';
import { BACK, Screen, ScreenHead } from '../components/Screen';
import { ErrorNotice, Loading } from '../components/notices';
import { useGame } from '../game';
import { errorCode, useLoad } from '../useLoad';

// §15.5: every user, a guest too, can download the data and delete it.
export function AccountScreen() {
  const { storage } = useGame();
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [user, reloadUser] = useLoad(loadUser);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const exportId = useId();
  const deleteId = useId();
  const hasData = user.status === 'ready' && user.value !== null;

  async function download() {
    setBusy(true);
    setFailure(null);
    setMessage(null);

    try {
      const data = await storage.account.exportData();

      if (data === null) {
        setMessage(accountTexts.nothing);
      } else {
        saveFile(data);
      }
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setFailure(null);

    try {
      await storage.account.deleteData();
      setConfirming(false);
      setMessage(accountTexts.deleted);
      reloadUser();
    } catch (error) {
      setConfirming(false);
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={accountTexts.title}>
      <ScreenHead back={BACK.modes} title={accountTexts.title} />
      <p className="lead">{accountTexts.intro}</p>
      {user.status === 'loading' && <Loading />}
      {user.status === 'failed' && <ErrorNotice error={user.error} onRetry={reloadUser} />}
      {failure !== null && <ErrorNotice error={failure} />}
      <p className="account-status" role="status">
        {message ?? (user.status === 'ready' && user.value === null ? accountTexts.nothing : '')}
      </p>
      {hasData && (
        <div className="account-sections">
          <section className="card account-section" aria-labelledby={exportId}>
            <h2 id={exportId} className="account-section__title">
              {accountTexts.exportTitle}
            </h2>
            <p>{accountTexts.exportText}</p>
            <button type="button" className="button button--outline button--large" disabled={busy} onClick={() => void download()}>
              {accountTexts.export}
            </button>
          </section>
          <section className="card account-section" aria-labelledby={deleteId}>
            <h2 id={deleteId} className="account-section__title">
              {accountTexts.deleteTitle}
            </h2>
            <p>{accountTexts.deleteText}</p>
            <button type="button" className="button button--danger button--large" disabled={busy} onClick={() => setConfirming(true)}>
              {accountTexts.delete}
            </button>
          </section>
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
    </Screen>
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
