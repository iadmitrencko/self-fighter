import { expect, test } from '@playwright/test';
import { expectAccessible, playFight, savedAttempts } from './helpers';

// §18 «Продукт»: one history of every battle with statistics. The history is a section of the
// game (§24.1), and a fight left in the middle counts there as lost (§24.6).
test('one history keeps every fight, a fight left in the middle as lost', async ({ page }) => {
  await playFight(page);
  await playFight(page, 'loss');

  // The old address of the site leads to the game.
  await page.goto('/workout/history');
  await expect(page).toHaveURL('/game/history');
  const stats = page.getByRole('region', { name: 'Загальна статистика' });
  await expect(stats.locator('.k-tally__total')).toHaveText('2 тренування');
  await expect(stats.getByRole('definition')).toHaveText(['1', '0', '1']);
  const attempts = page.getByRole('main').getByRole('listitem');
  await expect(attempts).toHaveCount(2);
  await expect(attempts.first()).toContainText('Бій · 3 раунди · 2 вправи · 0 з 6 підходів');
  await expectAccessible(page);

  await page.getByRole('radio', { name: 'Бій' }).check();
  await expect(attempts).toHaveCount(2);
  await page.getByRole('radio', { name: 'Похід' }).check();
  await expect(page.getByText('За цим фільтром тренувань немає.')).toBeVisible();
  await expect.poll(() => savedAttempts(page)).toBe(2);
});

// §18 «Продукт»: the data of a guest stays on the server for this browser and only for it.
test('a guest finds the history in the same browser only', async ({ page, browser }) => {
  await playFight(page);

  const again = await page.context().newPage();
  await again.goto('/game/history');
  await expect(again.getByRole('link', { name: /^Віджимання, Присідання/ })).toBeVisible();

  const otherBrowser = await browser.newContext();
  const stranger = await otherBrowser.newPage();
  await stranger.goto('/game/history');
  await expect(stranger.getByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeVisible();
  await otherBrowser.close();
});
