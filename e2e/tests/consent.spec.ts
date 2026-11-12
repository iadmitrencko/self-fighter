import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, finishSets, playFight, savedAttempts } from './helpers';

// The names of the events this page sends to the server, in the order the browser sends them.
function sentEvents(page: Page): string[] {
  const names: string[] = [];

  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/events') {
      names.push((request.postDataJSON() as { name: string }).name);
    }
  });

  return names;
}

// The names of the events the server took, in the order it answered.
function takenEvents(page: Page): string[] {
  const names: string[] = [];

  page.on('response', (response) => {
    if (new URL(response.url()).pathname === '/api/v1/events' && response.ok()) {
      names.push((response.request().postDataJSON() as { name: string }).name);
    }
  });

  return names;
}

function banner(page: Page) {
  return page.getByRole('region', { name: 'Згода на аналітику' });
}

// §18 «Пошук і приватність», §22: before the choice and after a refusal nothing is sent, and the game works.
test('no event leaves the browser before a choice and after a refusal', async ({ page }) => {
  const events = sentEvents(page);

  await page.goto('/game/fight');

  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole('button')).toHaveText(['Дозволити', 'Відхилити']);
  await expectAccessible(page);

  // A whole fight without a choice.
  await playFight(page);
  await expect.poll(() => savedAttempts(page)).toBe(1);

  await banner(page).getByRole('button', { name: 'Відхилити' }).click();

  await expect(banner(page)).toBeHidden();
  await page.getByRole('button', { name: /^Повторити/ }).click();
  await finishSets(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');

  // The decision stays in the browser, and a request started before the reload would show by now.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  await expect(banner(page)).toBeHidden();
  expect(events).toEqual([]);
});

// §19, §22: once allowed, the events reach the server; the footer withdraws the consent.
test('allowed events reach the server and stop once the decision changes', async ({ page }) => {
  const events = sentEvents(page);
  const taken = takenEvents(page);

  await page.goto('/');
  await banner(page).getByRole('button', { name: 'Дозволити' }).click();

  await expect(banner(page)).toBeHidden();

  await playFight(page);
  await page.getByRole('button', { name: /^Повторити/ }).click();
  await finishSets(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');

  const sent = ['workout_completed', 'workout_completed', 'workout_repeated', 'workout_started', 'workout_started'];
  await expect.poll(() => events.toSorted()).toEqual(sent);
  // The server takes every one of them; PHPUnit checks that it names the user.
  await expect.poll(() => taken.toSorted()).toEqual(sent);

  await page.getByRole('button', { name: 'Згода на аналітику' }).click();

  await expect(banner(page).getByText('Зараз аналітику дозволено.')).toBeVisible();

  await banner(page).getByRole('button', { name: 'Відхилити' }).click();
  await page.getByRole('button', { name: /^Повторити/ }).click();
  await finishSets(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  expect(events).toHaveLength(sent.length);
});

// §22: a small panel at the bottom that hides nothing for good.
test('the banner leaves the whole page within reach', async ({ page }) => {
  await page.goto('/about');
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };

  await expect(banner(page)).toBeVisible();
  const panel = await banner(page).boundingBox();
  expect(panel).not.toBeNull();
  expect(Math.round((panel?.y ?? 0) + (panel?.height ?? 0))).toBe(viewport.height);
  expect(panel?.height).toBeLessThan(viewport.height / 3);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const end = await page.locator('.site-footer__copy').boundingBox();

  expect((end?.y ?? Infinity) + (end?.height ?? 0)).toBeLessThanOrEqual(panel?.y ?? 0);
});
