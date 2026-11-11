import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import { expectAccessible, playShortTarget, savedAttempts } from './helpers';

interface GoogleAccount {
  readonly sub: string;
  readonly name: string;
  readonly email: string;
}

// Every test signs in with an account of its own: the tests of the three devices run at once.
function googleAccount(): GoogleAccount {
  const sub = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return { sub, name: 'Олена Коваль', email: `${sub}@example.com` };
}

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

// Signs in from the screen on display and waits for the way back from the fake Google.
async function signIn(page: Page, account: GoogleAccount, choice: 'Continue' | 'Cancel' = 'Continue'): Promise<void> {
  const screen = new URL(page.url()).pathname;

  await page.getByRole('link', { name: 'Увійти через Google' }).first().click();
  await expect(page.getByRole('heading', { name: 'Choose an account' })).toBeVisible();
  await page.getByLabel('Subject').fill(account.sub);
  await page.getByLabel('Name').fill(account.name);
  await page.getByLabel('Email').fill(account.email);
  await page.getByRole('button', { name: choice }).click();

  // The screen comes back without the outcome in its address, so a reload does not tell it again.
  await expect(page).toHaveURL(new RegExp(`${screen}$`));
}

// §24.1: the history is a section of the game.
async function historyItems(page: Page): Promise<number> {
  await page.goto('/game/history');
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  await expect(page.locator('.k-loading')).toHaveCount(0);

  return page.locator('.k-entry').count();
}

// §18 «Вхід через Google»: the first sign-in keeps the data of the guest, and another device sees it.
test('the history of an account opens on another device', async ({ page, browser }, testInfo) => {
  const account = googleAccount();
  await playShortTarget(page, 6);
  await page.goto('/game/settings');
  await expectAccessible(page);

  await signIn(page, account);

  await expect(page.getByText('Вхід виконано: тренування, вправи й налаштування тепер доступні на будь-якому пристрої.')).toBeVisible();
  await expect(page.getByText(account.email)).toBeVisible();
  expect(await historyItems(page)).toBe(1);

  const laptop = await anotherDevice(browser, testInfo);
  await laptop.goto('/game/settings');
  await signIn(laptop, account);

  expect(await historyItems(laptop)).toBe(1);
});

// §23.3: a guest of a browser joins the account it signs into, once and without duplicates.
test('a guest joins the account it signs into once', async ({ page, browser }, testInfo) => {
  const account = googleAccount();
  const laptop = await anotherDevice(browser, testInfo);
  await laptop.goto('/game/settings');
  await signIn(laptop, account);
  await playShortTarget(laptop, 6);

  await playShortTarget(page, 4);
  await page.goto('/game/history');
  await signIn(page, account);

  const dialog = page.getByRole('dialog', { name: 'Перенести дані цього браузера?' });
  await expect(dialog.getByText(/^У цьому браузері є 1 тренування, збережені без входу/)).toBeVisible();
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Перенести' }).click();

  await expect(page.getByText('Дані браузера перенесено в обліковий запис.')).toBeVisible();
  await expect(page.locator('.k-entry')).toHaveCount(2);

  // §23.2: signing out hides the account in this browser, and signing in again asks nothing.
  await page.goto('/game/settings');
  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByText(/^Вихід виконано/)).toBeVisible();
  expect(await historyItems(page)).toBe(0);
  expect(await (await page.request.get('/api/v1/me')).json()).toEqual({ user: null, guest: null });

  await page.goto('/game/settings');
  await signIn(page, account);

  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await historyItems(page)).toBe(2);
  expect(await savedAttempts(page)).toBe(2);
});

// §23.3: a person who does not join the data finds it in this browser after signing out.
test('a guest left apart comes back after signing out', async ({ page, browser }, testInfo) => {
  const account = googleAccount();
  const laptop = await anotherDevice(browser, testInfo);
  await laptop.goto('/game/settings');
  await signIn(laptop, account);
  await playShortTarget(laptop, 6);

  await playShortTarget(page, 4);
  await page.goto('/game/history');
  await signIn(page, account);
  await page.getByRole('dialog').getByRole('button', { name: 'Не переносити' }).click();

  await expect(page.locator('.k-entry')).toHaveCount(1);
  await expect(page.locator('.k-entry').getByText('Перемога')).toBeVisible();

  await page.goto('/game/settings');
  await expect(page.getByRole('region', { name: 'Дані без входу' })).toBeVisible();
  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByText(/^Вихід виконано/)).toBeVisible();

  await page.goto('/game/history');
  await expect(page.locator('.k-entry')).toHaveCount(1);
  await expect(page.locator('.k-entry').getByText('Поразка')).toBeVisible();
});

// The person changed their mind on the page of Google: the game works on as a guest.
test('a cancelled sign-in leaves the guest as it was', async ({ page }) => {
  await playShortTarget(page, 6);
  await page.goto('/game/history');

  await signIn(page, googleAccount(), 'Cancel');

  await expect(page.getByText('Вхід скасовано. Без входу гра працює так само.')).toBeVisible();
  expect(((await (await page.request.get('/api/v1/me')).json()) as { user: { kind: string } }).user.kind).toBe('guest');
  await expect(page.locator('.k-entry')).toHaveCount(1);
});
