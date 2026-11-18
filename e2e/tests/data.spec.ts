import { expect, test } from '@playwright/test';
import { expectAccessible, finishSets, openSignedIn, playFight, savedAttempts, signIn } from './helpers';

// §18 «Продукт», §15.4: an attempt finished without the network waits in the browser,
// goes to the server once the connection is back and is not duplicated.
test('an attempt finished offline is sent later, once', async ({ page, context }) => {
  await openSignedIn(page, '/game/fight');
  await page.getByRole('button', { name: /^До бою/ }).click();
  await expect(page.getByRole('dialog', { name: 'Бій' })).toBeVisible();

  await context.setOffline(true);
  await finishSets(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  await expect(page.getByText("Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.")).toBeVisible();

  await context.setOffline(false);
  await expect.poll(() => savedAttempts(page)).toBe(1);
  await page.reload();
  await expect(page.getByText('Спроба очікує надсилання', { exact: false })).toHaveCount(0);
  expect(await savedAttempts(page)).toBe(1);
});

// §18 «Продукт», §15.5: an account deletes every piece of data, itself included.
test('an account deletes the data', async ({ page }) => {
  const account = await openSignedIn(page, '/game/fight');
  await playFight(page);

  // §24.1: the data of the player lives in the settings of the game.
  await page.goto('/game/settings');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Видалити всі дані' }).click();
  await page.getByRole('dialog', { name: 'Видалити всі дані?' }).getByRole('button', { name: 'Видалити назавжди' }).click();

  // The browser has no account any more, so the way in says what happened.
  await expect(page.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  await expect(page.getByText('Обліковий запис і всі його дані видалено.')).toBeVisible();
  expect(await (await page.request.get('/api/v1/me')).json()).toEqual({ user: null });

  // The same Google account starts anew.
  await signIn(page, account);
  await page.goto('/game/history');
  await expect(page.getByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeVisible();
});
