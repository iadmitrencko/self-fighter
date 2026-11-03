import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_KEY, createConsent, initConsentBanner } from './consent';

// The banner and the button of the footer as templates/site/_consent.html.twig renders them.
const FRAME = `
  <section id="consent" aria-label="Згода на аналітику" tabindex="-1" hidden>
    <p>Дозволиш рахувати старти й завершення тренувань?</p>
    <p data-consent-status="granted" hidden>Зараз аналітику дозволено.</p>
    <p data-consent-status="denied" hidden>Зараз аналітику відхилено.</p>
    <button type="button" data-consent-choice="granted">Дозволити</button>
    <button type="button" data-consent-choice="denied">Відхилити</button>
  </section>
  <footer><button type="button" data-consent-open>Згода на аналітику</button></footer>
`;

function banner(): HTMLElement {
  const element = document.getElementById('consent');

  if (element === null) {
    throw new Error('The banner is missing.');
  }

  return element;
}

function button(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);

  if (element === null) {
    throw new Error(`${selector} is missing.`);
  }

  return element;
}

function visibleStatus(): string[] {
  return [...banner().querySelectorAll<HTMLElement>('[data-consent-status]')]
    .filter((status) => !status.hidden)
    .map((status) => status.textContent);
}

// Some private modes refuse every write.
function refusingStorage(): Storage {
  const storage = window.localStorage;

  return {
    ...storage,
    getItem: (key) => storage.getItem(key),
    setItem: () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    },
  };
}

// Fonts of the page that arrive when the test calls the returned function.
function pendingFonts(): () => void {
  let arrive: (value: void) => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true });

  return () => arrive();
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = FRAME;
});

afterEach(() => {
  document.documentElement.style.removeProperty('--consent-space');
  Reflect.deleteProperty(document, 'fonts');
});

describe('the decision about analytics', () => {
  it('waits for the visitor and stays in the browser', () => {
    const consent = createConsent(localStorage);

    expect(consent.decision()).toBeNull();

    consent.decide('granted');

    expect(consent.decision()).toBe('granted');
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(createConsent(localStorage).decision()).toBe('granted');
  });

  // §22: a change in another tab counts at once, so no event follows a refusal.
  it('follows a decision made in another tab', () => {
    const consent = createConsent(localStorage);
    consent.decide('granted');

    createConsent(localStorage).decide('denied');

    expect(consent.decision()).toBe('denied');
  });

  it('lasts as long as the page when the browser refuses to keep it', () => {
    const blocked = createConsent(null);
    const full = createConsent(refusingStorage());
    localStorage.setItem(CONSENT_KEY, 'granted');

    blocked.decide('denied');
    full.decide('denied');

    expect(blocked.decision()).toBe('denied');
    expect(full.decision()).toBe('denied');
  });

  it('ignores a value it did not write', () => {
    localStorage.setItem(CONSENT_KEY, 'maybe');

    expect(createConsent(localStorage).decision()).toBeNull();
  });
});

describe('the banner of consent', () => {
  // §22: every visitor is asked, before any choice nothing is sent.
  it('asks a visitor who has not decided and leaves room for itself', async () => {
    await initConsentBanner(createConsent(localStorage));

    expect(banner().hidden).toBe(false);
    expect(visibleStatus()).toEqual([]);
    expect(document.documentElement.style.getPropertyValue('--consent-space')).toBe('0px');
    // Shown by itself, the banner leaves the focus where it is.
    expect(document.activeElement).toBe(document.body);
  });

  it.each([
    ['Дозволити', 'granted'],
    ['Відхилити', 'denied'],
  ])('keeps the answer «%s» and goes away', async (_label, decision) => {
    const consent = createConsent(localStorage);
    await initConsentBanner(consent);

    button(`[data-consent-choice="${decision}"]`).click();

    expect(consent.decision()).toBe(decision);
    expect(banner().hidden).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--consent-space')).toBe('');
  });

  it('does not ask again once the visitor decided', async () => {
    localStorage.setItem(CONSENT_KEY, 'denied');

    await initConsentBanner(createConsent(localStorage));

    expect(banner().hidden).toBe(true);
  });

  // §22: the footer changes the decision as easily as the banner made it.
  it('opens again from the footer with the current decision', async () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    const consent = createConsent(localStorage);
    await initConsentBanner(consent);
    const opener = button('[data-consent-open]');

    opener.click();

    expect(banner().hidden).toBe(false);
    expect(visibleStatus()).toEqual(['Зараз аналітику дозволено.']);
    expect(document.activeElement).toBe(banner());

    button('[data-consent-choice="denied"]').click();

    expect(consent.decision()).toBe('denied');
    expect(banner().hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
  });

  it('goes away when the visitor answers in another tab', async () => {
    await initConsentBanner(createConsent(localStorage));

    localStorage.setItem(CONSENT_KEY, 'denied');
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY, newValue: 'denied' }));

    expect(banner().hidden).toBe(true);
  });

  it('stays open from the footer when another tab answers', async () => {
    localStorage.setItem(CONSENT_KEY, 'denied');
    await initConsentBanner(createConsent(localStorage));
    button('[data-consent-open]').click();

    window.dispatchEvent(new StorageEvent('storage', { key: 'self-fighter:outbox:1' }));
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY, newValue: 'granted' }));

    expect(banner().hidden).toBe(false);
  });

  it('does nothing on a page without the banner', async () => {
    document.body.innerHTML = '<main></main>';

    await expect(initConsentBanner(createConsent(localStorage))).resolves.toBeUndefined();
  });

  // Set in the fallback font, the banner would grow once the fonts arrive and move the page.
  it('waits for the fonts of the page before it asks', async () => {
    const fontsArrive = pendingFonts();
    const shown = initConsentBanner(createConsent(localStorage));
    await Promise.resolve();

    expect(banner().hidden).toBe(true);

    fontsArrive();
    await shown;

    expect(banner().hidden).toBe(false);
  });

  it('does not ask once the visitor answered while the fonts loaded', async () => {
    const fontsArrive = pendingFonts();
    const shown = initConsentBanner(createConsent(localStorage));
    button('[data-consent-open]').click();
    button('[data-consent-choice="denied"]').click();

    fontsArrive();
    await shown;

    expect(banner().hidden).toBe(true);
  });
});
