import { createContext, use, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { signInTexts, storageMessages } from '../../i18n/uk';
import type { StorageErrorCode } from '../../storage/errors';
import { useDataVersion } from '../data';
import { useGame } from '../game';
import {
  isEmbeddedBrowser,
  isWorthJoining,
  readSignInOutcome,
  signInPath,
  withoutSignInOutcome,
  type SignInOutcome as Outcome,
} from '../signIn';
import { errorCode, useLoad } from '../useLoad';
import { ConfirmDialog } from './Dialog';
import { Icon } from './Icon';
import { useRouterBase } from './routing';

// The server offers signing in with Google only when it has a client of Google Cloud (§23.2).
export function useCanSignIn(): boolean {
  return useGame().signIn.includes('google');
}

/**
 * The button of Google by its rules for the dark theme: the standard «G», «Увійти через Google»
 * in Google Sans. It leads to the server, which takes the browser to Google and back to this screen.
 */
export function GoogleButton() {
  const { pathname } = useLocation();
  const base = useRouterBase();

  return (
    <a className="google-button" href={signInPath(base, pathname)}>
      <GoogleLogo />
      <span>{signInTexts.button}</span>
    </a>
  );
}

// The button and, inside the browser of another app, how to get to one where Google lets in.
export function SignInWithGoogle() {
  return (
    <div className="sign-in">
      <GoogleButton />
      {isEmbeddedBrowser(navigator.userAgent) && <p className="hint">{signInTexts.embedded}</p>}
    </div>
  );
}

interface Prompt {
  readonly dismissed: boolean;
  readonly dismiss: () => void;
}

const PromptContext = createContext<Prompt>({ dismissed: false, dismiss: () => undefined });

// A closed offer stays closed while the game is open, so it does not get in the way (§23.2).
export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const prompt = useMemo(() => ({ dismissed, dismiss: () => setDismissed(true) }), [dismissed]);

  return <PromptContext value={prompt}>{children}</PromptContext>;
}

// §23.2: the offer to sign in, after the first workout and on the screen of the history in the game.
export function SignInPrompt({ text }: { text: string }) {
  const { dismissed, dismiss } = use(PromptContext);
  const canSignIn = useCanSignIn();
  const titleId = useId();

  if (dismissed || !canSignIn) {
    return null;
  }

  return (
    <section className="card sign-in-prompt" aria-labelledby={titleId}>
      <div className="sign-in-prompt__head">
        <h2 id={titleId} className="sign-in-prompt__title">
          {signInTexts.promptTitle}
        </h2>
        <button type="button" className="sign-in-prompt__close" aria-label={signInTexts.dismiss} onClick={dismiss}>
          <Icon name="close" />
        </button>
      </div>
      <p>{text}</p>
      <SignInWithGoogle />
    </section>
  );
}

/**
 * §23.2–§23.3: Google sends the browser back to the screen it left, on the site or in the game, and
 * the address tells how the sign-in went. A guest of this browser with data waits for the person to
 * decide whether to join it.
 */
export function SignInOutcome() {
  const { storage } = useGame();
  const { changed } = useDataVersion();
  const location = useLocation();
  const navigate = useNavigate();
  // Read once: the address forgets the outcome at once, so a reload does not tell it again.
  const [outcome] = useState(() => readSignInOutcome(location.search));
  const forgotten = useRef(false);
  const loadGuest = useCallback(
    () => (outcome === 'done' ? storage.account.keptGuest() : Promise.resolve(null)),
    [storage, outcome],
  );
  const [guest] = useLoad(loadGuest);
  const [closed, setClosed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<StorageErrorCode | null>(null);

  useEffect(() => {
    if (outcome !== null && !forgotten.current) {
      forgotten.current = true;
      void navigate(
        { pathname: location.pathname, search: withoutSignInOutcome(location.search), hash: location.hash },
        { replace: true },
      );
    }
  }, [outcome, navigate, location]);

  async function join() {
    setBusy(true);

    try {
      await storage.account.joinGuest();
      setJoined(true);
      changed();
    } catch (error) {
      setFailure(errorCode(error));
    } finally {
      setBusy(false);
    }
  }

  if (outcome === null || closed || (outcome === 'done' && guest.status === 'loading')) {
    return null;
  }

  if (outcome === 'done' && guest.status === 'ready' && isWorthJoining(guest.value) && !joined && failure === null) {
    const { attempts, exercises } = guest.value;

    return (
      <ConfirmDialog
        title={signInTexts.joinTitle}
        text={signInTexts.joinText(attempts, exercises)}
        confirm={signInTexts.join}
        cancel={signInTexts.keepApart}
        tone="primary"
        busy={busy}
        onConfirm={() => void join()}
        onCancel={() => setClosed(true)}
      />
    );
  }

  const { tone, text } =
    failure !== null
      ? { tone: 'error', text: storageMessages[failure] }
      : joined
        ? { tone: 'done', text: signInTexts.joined }
        : OUTCOME_NOTICES[outcome];

  return (
    <div className="app-notice">
      <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
        <p>{text}</p>
        <button type="button" className="button button--outline" onClick={() => setClosed(true)}>
          {signInTexts.close}
        </button>
      </div>
    </div>
  );
}

const OUTCOME_NOTICES: Record<Outcome, { tone: 'done' | 'warning' | 'error'; text: string }> = {
  done: { tone: 'done', text: signInTexts.done },
  cancelled: { tone: 'warning', text: signInTexts.cancelled },
  failed: { tone: 'error', text: signInTexts.failed },
};

// The standard logo of Google: its colors belong to the mark, not to the palette of the site.
function GoogleLogo() {
  return (
    <svg className="google-button__logo" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
