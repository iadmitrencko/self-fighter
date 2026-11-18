import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import { expectAccessible, googleAccount, playFight, savedAttempts, signIn } from './helpers';

// Another device of the same person: a browser with nothing of this one.
async function anotherDevice(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const { baseURL, ignoreHTTPSErrors, locale, timezoneId, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    testInfo.project.use;
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors,
    locale,
    timezoneId,
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  });

  return context.newPage();
}

// §24.1: the history is a section of the game.
async function historyItems(page: Page): Promise<number> {
  await page.goto('/game/history');
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  await expect(page.locator('.k-loading')).toHaveCount(0);

  return page.locator('.k-entry').count();
}

// The account this browser has open, as the server tells it: null without one.
async function me(page: Page): Promise<unknown> {
  return (await page.request.get('/api/v1/me')).json();
}

// §18 «Вхід через Google», §23.1: every screen of the game asks to sign in first, and Google brings
// the browser back to the screen it asked from.
test('the game asks to sign in and opens on the screen it asked from', async ({ page }) => {
  await page.goto('/game/history');

  await expect(page.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Розділи гри' })).toHaveCount(0);
  expect(await me(page)).toEqual({ user: null });
  await expectAccessible(page);

  await signIn(page, googleAccount(), { keepToast: true });

  // A sign-in that went well says so in a toast over the screen, which its cross closes at once.
  const toast = page.getByRole('status').filter({ hasText: 'Вхід виконано' });
  await expect(toast).toContainText('Козак і його бої тепер відкриваються на будь-якому пристрої.');
  await expect(toast).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  await expectAccessible(page);
  await toast.getByRole('button', { name: 'Закрити' }).click();
  await expect(toast).toHaveCount(0);
});

// §18 «Вхід через Google»: the history of an account opens on another device.
test('the history of an account opens on another device', async ({ page, browser }, testInfo) => {
  const account = googleAccount();
  await page.goto('/game/settings');
  await signIn(page, account);
  await expect(page.getByText(account.email)).toBeVisible();
  await playFight(page);
  expect(await historyItems(page)).toBe(1);

  const laptop = await anotherDevice(browser, testInfo);
  await laptop.goto('/game/settings');
  await signIn(laptop, account);

  expect(await historyItems(laptop)).toBe(1);
});

// §23.2: signing out leaves the way in, and signing in again brings the data back.
test('signing out hides the account until the next sign-in', async ({ page }) => {
  const account = googleAccount();
  await page.goto('/game/settings');
  await signIn(page, account);
  await playFight(page);

  await page.goto('/game/settings');
  await page.getByRole('button', { name: 'Вийти' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  await expect(page.getByText(/^Вихід виконано/)).toBeVisible();
  expect(await me(page)).toEqual({ user: null });
  await expectAccessible(page);

  await signIn(page, account);

  expect(await historyItems(page)).toBe(1);
  expect(await savedAttempts(page)).toBe(1);
});

// The person changed their mind on the page of Google: the way in stays.
test('a cancelled sign-in keeps the way in', async ({ page }) => {
  await page.goto('/game/history');

  await signIn(page, googleAccount(), { cancel: true });

  await expect(page.getByText('Вхід скасовано. Щоб грати, увійди через Google.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  expect(await me(page)).toEqual({ user: null });
});
