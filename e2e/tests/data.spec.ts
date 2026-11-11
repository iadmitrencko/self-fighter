import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { addExercises, enter, expectAccessible, field, savedAttempts, setRounds } from './helpers';

// §18 «Продукт», §15.4: an attempt finished without the network waits in the browser,
// goes to the server once the connection is back and is not duplicated.
test('an attempt finished offline is sent later, once', async ({ page, context }) => {
  await page.goto('/workout/setup/target');
  await addExercises(page, 'Віджимання');
  await setRounds(page, 1);
  await field(page, 'Віджимання, раунд 1').fill('5');
  await page.getByRole('button', { name: 'Почати бій' }).click();

  await context.setOffline(true);
  await enter(page, 6);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText("Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.")).toBeVisible();

  await context.setOffline(false);
  await expect.poll(() => savedAttempts(page)).toBe(1);
  await page.reload();
  await expect(page.getByText('Спроба очікує надсилання', { exact: false })).toHaveCount(0);
  expect(await savedAttempts(page)).toBe(1);
});

// §18 «Продукт», §15.5: a guest downloads every piece of data and deletes it.
test('a guest downloads the data and deletes it', async ({ page }) => {
  await page.goto('/workout/setup/target');
  await addExercises(page, 'Присідання');
  await setRounds(page, 1);
  await field(page, 'Присідання, раунд 1').fill('10');
  await page.getByRole('button', { name: 'Почати бій' }).click();
  await enter(page, 12);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');

  // §24.1: the data of the player lives in the settings of the game.
  await page.goto('/game/settings');
  await expectAccessible(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Завантажити дані' }).click(),
  ]);
  const data = JSON.parse(await readFile(await download.path(), 'utf8')) as { attempts: unknown[] };
  expect(download.suggestedFilename()).toBe('self-fighter-data.json');
  expect(data.attempts).toHaveLength(1);

  await page.getByRole('button', { name: 'Видалити всі дані' }).click();
  await page.getByRole('dialog', { name: 'Видалити всі дані?' }).getByRole('button', { name: 'Видалити назавжди' }).click();

  await expect(page.getByText('Дані видалено.')).toBeVisible();
  await page.goto('/game/history');
  await expect(page.getByText('Історія ще порожня. Тут з’являться завершені бої, рівні походу й тренування.')).toBeVisible();
  const me = await page.request.get('/api/v1/me');
  expect(await me.json()).toEqual({ user: null, guest: null });
});
