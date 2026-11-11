import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { commonTexts } from '../../i18n/uk';

// A modal dialog of the browser: the page behind it is inert and Escape closes it.
// It opens when it appears, so a screen shows it with `{open && <Dialog />}`.
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The dialog closes itself on the way out, and the browser tells of that closing a moment later.
  // It is no answer of the person: React in development leaves and opens a new dialog at once.
  const leaving = useRef(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();

    // Closing before the dialog leaves the page returns the focus to the button that opened it.
    return () => {
      if (element?.open === true) {
        leaving.current = true;
        element.close();
      }
    };
  }, []);

  const closed = () => {
    if (leaving.current) {
      leaving.current = false;

      return;
    }
    onClose();
  };

  return (
    <dialog ref={dialog} className="dialog" aria-labelledby={titleId} onClose={closed}>
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      {children}
    </dialog>
  );
}

// The safe answer comes first, so it is the one a stray tap or Enter picks. A confirmation that
// loses nothing looks like the main action instead of a warning.
export function ConfirmDialog({
  title,
  text,
  confirm,
  cancel = commonTexts.cancel,
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirm: string;
  cancel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="dialog__text">{text}</p>
      <div className="dialog__actions">
        <button type="button" className="button button--outline button--large" onClick={onCancel}>
          {cancel}
        </button>
        <button
          type="button"
          className={`button button--${tone} button--large`}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirm}
        </button>
      </div>
    </Dialog>
  );
}
