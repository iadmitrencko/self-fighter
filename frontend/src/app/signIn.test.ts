import { describe, expect, it } from 'vitest';
import { isEmbeddedBrowser, isWorthJoining, readSignInOutcome, signInPath, withoutSignInOutcome } from './signIn';

describe('signing in with Google', () => {
  // The server brings the browser back to the screen it left.
  it('leads back to the screen it starts from', () => {
    expect(signInPath('/fight/setup/ladder')).toBe('/connect/google?to=%2Fgame%2Ffight%2Fsetup%2Fladder');
    expect(signInPath('/')).toBe('/connect/google?to=%2Fgame');
    // §24.1: the history and the settings are sections of the game.
    expect(signInPath('/history')).toBe('/connect/google?to=%2Fgame%2Fhistory');
    expect(signInPath('/settings')).toBe('/connect/google?to=%2Fgame%2Fsettings');
  });

  it('reads how the sign-in went and forgets it', () => {
    expect(['done', 'cancelled', 'failed'].map((value) => readSignInOutcome(`?sign-in=${value}`))).toEqual([
      'done',
      'cancelled',
      'failed',
    ]);
    expect(readSignInOutcome('?sign-in=granted')).toBeNull();
    expect(readSignInOutcome('')).toBeNull();
    expect(withoutSignInOutcome('?sign-in=done')).toBe('');
    expect(withoutSignInOutcome('?mode=ladder&sign-in=failed')).toBe('?mode=ladder');
  });

  // §23.3: a guest with nothing to miss is not worth a question.
  it('asks about a guest with attempts or custom exercises only', () => {
    expect(isWorthJoining({ id: 'a', attempts: 1, exercises: 0 })).toBe(true);
    expect(isWorthJoining({ id: 'a', attempts: 0, exercises: 2 })).toBe(true);
    expect(isWorthJoining({ id: 'a', attempts: 0, exercises: 0 })).toBe(false);
    expect(isWorthJoining(null)).toBe(false);
  });

  // §23.2: Google refuses to sign in inside the browsers of other apps.
  it.each([
    ['Instagram', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.114 (iPhone14,5; iOS 17_0; uk_UA)'],
    ['Facebook', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/437.0.0.36.111;FBBV/559873232]'],
    ['Telegram on Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.2'],
    ['a web view of Android', 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36'],
    ['a web view of iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'],
  ])('knows the browser of %s', (_, userAgent) => {
    expect(isEmbeddedBrowser(userAgent)).toBe(true);
  });

  it.each([
    ['Safari on iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'],
    ['Chrome on iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1'],
    ['Chrome on Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'],
    ['Firefox on a desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'],
  ])('lets %s sign in', (_, userAgent) => {
    expect(isEmbeddedBrowser(userAgent)).toBe(false);
  });
});
