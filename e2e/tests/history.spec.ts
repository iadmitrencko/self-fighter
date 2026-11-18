import { expect, test } from '@playwright/test';
import { expectAccessible, openSignedIn, playFight, savedAttempts, signIn } from './helpers';

// §18 «Продукт»: one history of every battle with statistics. The history is a section of the
// game (§24.1), and a fight left in the middle counts there as lost (§24.6).
test('one history keeps every fight, a fight left in the middle as lost', async ({ page }) => {
  await openSignedIn(page, '/game/fight');
  await playFight(page);
  await playFight(page, 'loss');

  await page.goto('/game/history');
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

// §18 «Продукт», §23.1: the history belongs to the account: every tab of it shows the history, and
// another person sees only their own.
test('an account finds its history in every tab, and nobody else does', async ({ page, browser }) => {
  await openSignedIn(page, '/game/fight');
  await playFight(page);

  const again = await page.context().newPage();
  await again.goto('/game/history');
  await expect(again.getByRole('link', { name: /^Відтискання, Присідання/ })).toBeVisible();

  const otherBrowser = await browser.newContext();
  const stranger = await otherBrowser.newPage();
  await stranger.goto('/game/history');
  await expect(stranger.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  await signIn(stranger);
  await expect(stranger.getByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeVisible();
  await otherBrowser.close();
});
