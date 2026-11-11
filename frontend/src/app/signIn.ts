import type { KeptGuest } from '../storage/contract';

// How the sign-in went, as the server tells it in the address of the screen it comes back to.
export type SignInOutcome = 'done' | 'cancelled' | 'failed';

const OUTCOME = 'sign-in';
const OUTCOMES: readonly SignInOutcome[] = ['done', 'cancelled', 'failed'];

// The address of signing in with Google that brings the browser back to this screen (§23.2):
// `base` is where the router of the page lives, /workout or /game.
export function signInPath(base: string, screen: string): string {
  return `/connect/google?to=${encodeURIComponent(screen === '/' ? base : `${base}${screen}`)}`;
}

export function readSignInOutcome(search: string): SignInOutcome | null {
  const value = new URLSearchParams(search).get(OUTCOME);

  return OUTCOMES.find((outcome) => outcome === value) ?? null;
}

// The address without the outcome, so a reload does not tell it again.
export function withoutSignInOutcome(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(OUTCOME);
  const rest = params.toString();

  return rest === '' ? '' : `?${rest}`;
}

// §23.3: the person is asked about a guest with attempts or custom exercises only.
export function isWorthJoining(guest: KeptGuest | null): guest is KeptGuest {
  return guest !== null && guest.attempts + guest.exercises > 0;
}

/**
 * Browsers built into other apps, where Google refuses to sign in (§23.2): those of Facebook,
 * Instagram, Telegram and the like, and the web views of Android and iOS. A browser of iOS without
 * «Safari/» is a web view: Safari, Chrome and Firefox there all name it.
 */
export function isEmbeddedBrowser(userAgent: string): boolean {
  return (
    /\b(FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Telegram|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp)/i.test(
      userAgent,
    ) ||
    /; wv\)/.test(userAgent) ||
    /\b(iPhone|iPad|iPod)\b(?!.*Safari\/).*AppleWebKit/.test(userAgent)
  );
}
