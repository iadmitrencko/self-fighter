import { expect, test } from '@playwright/test';
import { enter, expectAccessible, field, playShortTarget, savedAttempts } from './helpers';

// §18 «Продукт» and «Режими»: one history for all modes with statistics. The history is a section
// of the game (§24.1), and a fight left in the middle counts there as lost (§24.6).
test('one history keeps every mode and a fight left in the middle as lost', async ({ page }) => {
  await playShortTarget(page, 6);
  await page.goto('/game/fight/setup/ladder');
  await page.getByRole('radio', { name: 'Віджимання' }).check();
  await field(page, /Максимум драбини/).fill('2');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await enter(page, 0, 'Зафіксувати етап');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▼ Поразка');

  await page.goto('/game/fight/setup/ladder');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await page.getByRole('button', { name: 'Відступити' }).click();
  await page.getByRole('dialog', { name: 'Відступити з бою?' }).getByRole('button', { name: 'Відступити' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▼ Поразка');

  // The old address of the site leads to the game.
  await page.goto('/workout/history');
  await expect(page).toHaveURL('/game/history');
  const stats = page.getByRole('region', { name: 'Загальна статистика' });
  await expect(stats.locator('.k-tally__total')).toHaveText('3 тренування');
  await expect(stats.getByRole('definition')).toHaveText(['1', '0', '2']);
  const attempts = page.getByRole('main').getByRole('listitem');
  await expect(attempts).toHaveCount(3);
  await expectAccessible(page);

  await page.getByRole('radio', { name: 'Драбина' }).check();
  await expect(attempts).toHaveCount(2);
  await expect.poll(() => savedAttempts(page)).toBe(3);
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
  await expect(stranger.getByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeVisible();
  await otherBrowser.close();
});
