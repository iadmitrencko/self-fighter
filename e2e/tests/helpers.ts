import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Every screen passes axe: the rules of WCAG 2.2 AA and the best practices (section 7 of the plan).
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

export interface GoogleAccount {
  readonly sub: string;
  readonly name: string;
  readonly email: string;
}

// Every test signs in with an account of its own: the tests of the three devices run at once. An
// empty name is a person Google tells no name of, whose cossack has none yet (§24.11).
export function googleAccount(name = 'Олена Коваль'): GoogleAccount {
  const sub = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return { sub, name, email: `${sub}@example.com` };
}

interface SignInOptions {
  // The person changes their mind on the page of Google.
  readonly cancel?: boolean;
  // The toast of a sign-in that went well fades in and out over the screen, and axe takes a toast
  // halfway faded for one without contrast, so the tests close it at once unless they look at it.
  readonly keepToast?: boolean;
}

// §23.1: the game needs an account. Signs in from the screen on display and waits for the way back
// from the fake Google (e2e/fake-google.mjs) to the same screen.
export async function signIn(page: Page, account = googleAccount(), { cancel = false, keepToast = false }: SignInOptions = {}): Promise<void> {
  const screen = new URL(page.url()).pathname;

  await page.getByRole('link', { name: 'Увійти через Google' }).first().click();
  await expect(page.getByRole('heading', { name: 'Choose an account' })).toBeVisible();
  await page.getByLabel('Subject').fill(account.sub);
  await page.getByLabel('Name').fill(account.name);
  await page.getByLabel('Email').fill(account.email);
  await page.getByRole('button', { name: cancel ? 'Cancel' : 'Continue' }).click();

  // The screen comes back without the outcome in its address, so a reload does not tell it again.
  await expect(page).toHaveURL(new RegExp(`${screen}$`));

  if (!cancel && !keepToast) {
    const toast = page.getByRole('status').filter({ hasText: 'Вхід виконано' });
    await toast.getByRole('button', { name: 'Закрити' }).click();
    await expect(toast).toHaveCount(0);
  }
}

// Opens a screen of the game as a new person who signs in there, as the game asks (§23.1).
export async function openSignedIn(page: Page, path: string, account = googleAccount()): Promise<GoogleAccount> {
  await page.goto(path);
  await signIn(page, account);

  return account;
}

// §6: says every set of the fight on the screen is done and ends it.
export async function finishSets(page: Page): Promise<void> {
  const battle = page.getByRole('dialog', { name: 'Бій' });
  const sets = Number(await battle.getByRole('progressbar', { name: 'Підходи' }).getAttribute('aria-valuemax'));

  for (let set = 0; set < sets; set += 1) {
    await battle.getByRole('button', { name: 'Підхід виконано' }).click();
  }
  await expect(battle.getByText('Усі підходи виконано')).toBeVisible();
  await battle.getByRole('button', { name: 'Завершити бій' }).click();
}

// §6: the fight the hall offers, every set done, or left at once, which loses it (§24.6).
export async function playFight(page: Page, outcome: 'win' | 'loss' = 'win'): Promise<void> {
  await page.goto('/game/fight');
  await page.getByRole('button', { name: /^До бою/ }).click();
  const battle = page.getByRole('dialog', { name: 'Бій' });
  await expect(battle).toBeVisible();

  if (outcome === 'win') {
    await finishSets(page);
  } else {
    await battle.getByRole('button', { name: 'Завершити', exact: true }).click();
    await page.getByRole('dialog', { name: 'Відступити з бою?' }).getByRole('button', { name: 'Відступити' }).click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(outcome === 'win' ? 'Бій виграно' : 'Бій програно');
}

export async function savedAttempts(page: Page): Promise<number> {
  const response = await page.request.get('/api/v1/attempts');

  return response.ok() ? ((await response.json()) as { items: unknown[] }).items.length : 0;
}

// §24.1: opens a screen of the game the way a player finds it. A wide screen keeps the sections in a
// column and the settings in the menu of the player in the header; on a phone the history and that
// menu wait behind «Ще» in the bar of the sections.
export async function openSection(page: Page, name: string): Promise<void> {
  const sections = page.getByRole('navigation', { name: 'Розділи гри' });
  const more = sections.getByRole('button', { name: 'Ще' });

  if (await sections.getByRole('link', { name }).isVisible()) {
    await sections.getByRole('link', { name }).click();
  } else if (await more.isVisible()) {
    await more.click();
    await sections.getByRole('link', { name }).click();
  } else {
    const header = page.getByRole('banner');

    await header.getByRole('button', { name: 'Меню гравця' }).click();
    await header.getByRole('link', { name }).click();
  }
}
