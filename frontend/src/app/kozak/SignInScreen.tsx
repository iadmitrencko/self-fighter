import { useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { lookTexts } from '../../i18n/kozak';
import { commonTexts, signInTexts } from '../../i18n/uk';
import { Title } from '../components/Screen';
import { SignInWithGoogle, useCanSignIn } from '../components/SignIn';
import { ErrorNotice } from '../components/notices';
import { useGame } from '../game';
import { useLoad } from '../useLoad';
import { CossackFigure } from './art/Cossack';
import { KozakScreen } from './parts';

/**
 * §23.1: the game needs an account. Until the person signs in with Google every screen of the game
 * asks for it, and Google brings the browser back to the screen it left. Signing out and deleting
 * the data change the version of the data, so the screen asks again who plays.
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { storage } = useGame();
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [user, reload] = useLoad(loadUser);

  if (user.status === 'loading') {
    return (
      <p className="k-loading" role="status">
        {commonTexts.loading}
      </p>
    );
  }
  if (user.status === 'failed') {
    return <ErrorNotice error={user.error} onRetry={reload} />;
  }

  return user.value === null ? <SignInScreen /> : children;
}

// The cossack of a beginner waits for the person, with the way in and what is kept about them.
function SignInScreen() {
  const canSignIn = useCanSignIn();
  // Signing out and deleting the data lead here and say what they did.
  const notice = noticeOf(useLocation().state);

  return (
    <KozakScreen title={signInTexts.title} className="k-cossack k-sign-in-screen">
      {notice !== null && (
        <p className="k-sign-in__notice" role="status">
          {notice}
        </p>
      )}
      <section className="k-hero k-sign-in">
        <figure className="k-hero__portrait">
          <CossackFigure look="recruit" label={lookTexts.recruit.figure} />
        </figure>
        <div className="k-hero__body">
          <Title className="k-sign-in__title">{signInTexts.title}</Title>
          <p className="k-sign-in__lead">{signInTexts.lead}</p>
          {canSignIn ? (
            <SignInWithGoogle />
          ) : (
            <p className="notice notice--warning" role="status">
              {signInTexts.unavailable}
            </p>
          )}
          <p className="k-sign-in__privacy">
            <a href="/privacy">{signInTexts.privacy}</a>
          </p>
        </div>
      </section>
    </KozakScreen>
  );
}

function noticeOf(state: unknown): string | null {
  return typeof state === 'object' && state !== null && 'notice' in state && typeof state.notice === 'string' ? state.notice : null;
}
