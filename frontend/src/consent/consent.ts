// §22: the decision of the visitor about analytics. It lives in this browser only: the server
// never learns it, and the pages stay the same for everyone.
export const CONSENT_KEY = 'self-fighter:analytics';

export type Decision = 'granted' | 'denied';

export interface Consent {
  // null until the visitor decides.
  decision(): Decision | null;
  decide(decision: Decision): void;
}

// The stored decision is shared by the tabs, so a change in one of them counts in every other at
// once. A browser that refuses localStorage keeps the decision for this page only.
export function createConsent(storage: Storage | null): Consent {
  let memory: Decision | null = null;
  let stored = storage !== null;

  return {
    decision() {
      const value = stored ? quietly(() => storage?.getItem(CONSENT_KEY) ?? null, null) : null;

      return isDecision(value) ? value : memory;
    },
    decide(decision) {
      memory = decision;
      stored = quietly(() => {
        storage?.setItem(CONSENT_KEY, decision);

        return storage !== null;
      }, false);
    },
  };
}

/**
 * The banner of the frame (templates/site/_consent.html.twig) for the site and the game alike.
 * It asks a visitor who has not decided yet; the button in the footer opens it again.
 * Resolves once the question is on the screen.
 */
export function initConsentBanner(consent: Consent, root: Document = document): Promise<void> {
  const banner = root.getElementById('consent');

  if (banner === null) {
    return Promise.resolve();
  }
  const space = reserveSpace(banner, root.documentElement);
  // The button of the footer that opened the banner gets the focus back.
  let opener: HTMLElement | null = null;

  const show = (from: HTMLElement | null) => {
    const current = consent.decision();

    for (const status of banner.querySelectorAll<HTMLElement>('[data-consent-status]')) {
      status.hidden = status.dataset.consentStatus !== current;
    }
    opener = from;
    banner.hidden = false;
    space.update();
    if (from !== null) {
      banner.focus();
    }
  };

  const hide = () => {
    banner.hidden = true;
    space.update();
  };

  for (const button of banner.querySelectorAll<HTMLElement>('[data-consent-choice]')) {
    button.addEventListener('click', () => {
      consent.decide(button.dataset.consentChoice === 'granted' ? 'granted' : 'denied');
      hide();
      opener?.focus();
      opener = null;
    });
  }
  for (const button of root.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    button.addEventListener('click', () => show(button));
  }
  // A visitor who answered in another tab is not asked here again.
  root.defaultView?.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY && opener === null && consent.decision() !== null) {
      hide();
    }
  });

  // Set in the fallback font, the banner would grow once the fonts arrive and move the page with it
  // (section 6.4 of the plan), so it waits for them.
  const fonts: Promise<unknown> = root.fonts?.ready ?? Promise.resolve();

  return fonts.then(() => {
    if (banner.hidden && consent.decision() === null) {
      show(null);
    }
  });
}

// The banner covers the bottom of the window, so the page grows by its height: the end of the page
// still scrolls out from under it, and nothing above moves.
function reserveSpace(banner: HTMLElement, page: HTMLElement): { update(): void } {
  const update = () => {
    if (banner.hidden) {
      page.style.removeProperty('--consent-space');
    } else {
      page.style.setProperty('--consent-space', `${banner.offsetHeight}px`);
    }
  };
  // The height changes with the width of the window and once the fonts arrive.
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
  observer?.observe(banner);

  return { update };
}

function isDecision(value: string | null): value is Decision {
  return value === 'granted' || value === 'denied';
}

function quietly<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}
