import { expect, test } from '@playwright/test';
import { enter, expectAccessible, field, playShortTarget, savedAttempts } from './helpers';

// §18 «Продукт» and «Режими»: one history for all modes with statistics; an interrupted
// attempt counts nowhere.
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

  await page.goto('/workout/history');
  const stats = page.getByRole('region', { name: 'Загальна статистика' });
  await expect(stats.getByText('Завершено тренувань').locator('xpath=following-sibling::*')).toHaveText('2');
  await expect(stats.getByRole('definition')).toHaveText(['1', '0', '1']);
  await expect(page.getByRole('list').last().getByRole('listitem')).toHaveCount(2);
  await expectAccessible(page);

  await page.getByRole('radio', { name: 'Драбина' }).check();
  await expect(page.getByRole('list').last().getByRole('listitem')).toHaveCount(1);
  expect(await savedAttempts(page)).toBe(2);
});

// §18 «Продукт»: the data of a guest stays on the server for this browser and only for it.
test('a guest finds the history in the same browser only', async ({ page, browser }) => {
  await playShortTarget(page, 6);

  const again = await page.context().newPage();
  await again.goto('/workout/history');
  await expect(again.getByRole('link', { name: /^Ціль/ })).toBeVisible();

  const otherBrowser = await browser.newContext();
  const stranger = await otherBrowser.newPage();
  await stranger.goto('/workout/history');
  await expect(stranger.getByText('Ще немає завершених тренувань.')).toBeVisible();
  await otherBrowser.close();
});
