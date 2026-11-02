import type { Outcome } from '../../domain/results/results';
import type { AttemptStatus } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { commonTexts, memoryOnlyWarning, outcomeTexts, storageMessages } from '../../i18n/uk';
import { useGame } from '../game';

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const { symbol, name } = outcomeTexts[outcome];

  return (
    <span className={`badge badge--${outcome}`}>
      <span aria-hidden="true">{symbol}</span> {name}
    </span>
  );
}

// §15.4: an attempt that has not reached the server yet says so.
export function StatusBadge({ status }: { status: AttemptStatus }) {
  if (status === 'saved') {
    return null;
  }

  return (
    <span className={`badge badge--${status}`}>
      {status === 'pending' ? commonTexts.pending : commonTexts.rejected}
    </span>
  );
}

export function Loading() {
  return (
    <p className="loading" role="status">
      {commonTexts.loading}
    </p>
  );
}

// §17.2: a failure is explained in plain words and can be repeated.
export function ErrorNotice({
  error,
  onRetry,
}: {
  error: StorageErrorCode;
  onRetry?: () => void;
}) {
  return (
    <div className="notice notice--error" role="alert">
      <p>{storageMessages[error]}</p>
      {onRetry !== undefined && (
        <button type="button" className="button button--outline" onClick={onRetry}>
          {commonTexts.retry}
        </button>
      )}
    </div>
  );
}

// §17.2: without localStorage the game works, but an attempt in progress does not survive a reload.
export function MemoryWarning() {
  const { storage } = useGame();

  return storage.persistent ? null : <p className="notice notice--warning">{memoryOnlyWarning}</p>;
}
