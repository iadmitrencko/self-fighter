import { expect, test } from '@playwright/test';
import { enter, expectAccessible, field, playShortTarget, savedAttempts } from './helpers';

// §18 «Продукт» and «Режими»: one history for all modes with statistics; an interrupted
// attempt counts nowhere. The history is a section of the game (§24.1).
test('one history keeps every mode and leaves interrupted attempts out', async ({ page }) => {
  await playShortTarget(page, 6);
  await page.goto('/workout/setup/ladder');
  await page.getByRole('radio', { name: 'Віджимання' }).check();
  await field(page, /Максимум драбини/).fill('2');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await enter(page, 0, 'Зафіксувати етап');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▼ Поразка');

  await page.goto('/workout/setup/ladder');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await page.getByRole('button', { name: 'Перервати' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Перервати' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeVisible();

  // The old address of the site leads to the game.
  await page.goto('/workout/history');
  await expect(page).toHaveURL('/game/history');
  const stats = page.getByRole('region', { name: 'Загальна статистика' });
  await expect(stats.locator('.k-tally__total')).toHaveText('2 тренування');
  await expect(stats.getByRole('definition')).toHaveText(['1', '0', '1']);
  const attempts = page.getByRole('main').getByRole('listitem');
  await expect(attempts).toHaveCount(2);
  await expectAccessible(page);

  await page.getByRole('radio', { name: 'Драбина' }).check();
  await expect(attempts).toHaveCount(1);
  expect(await savedAttempts(page)).toBe(2);
});

// §18 «Продукт»: the data of a guest stays on the server for this browser and only for it.
test('a guest finds the history in the same browser only', async ({ page, browser }) => {
  await playShortTarget(page, 6);

  const again = await page.context().newPage();
  await again.goto('/game/history');
  await expect(again.getByRole('link', { name: /^Ціль/ })).toBeVisible();

  const otherBrowser = await browser.newContext();
  const stranger = await otherBrowser.newPage();
  await stranger.goto('/game/history');
  await expect(stranger.getByText('Історія ще порожня. Тут з’являться завершені бої, рівні походу й тренування.')).toBeVisible();
  await otherBrowser.close();
});
