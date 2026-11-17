import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

// §18 «Продукт»: the landing tells what the cossack game is, and the game starts without signing up.
test('the landing explains the game and opens it without signing up', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Від джури до гетьмана — підхід за підходом.');
  await expect(page.locator('#game h3')).toHaveText(['Бій', 'Похід «Січ»', 'Слава й звання', 'Енергія']);
  await expectAccessible(page);

  await page.getByRole('main').getByRole('link', { name: 'Почати бій' }).first().click();

  // §24.1: everything is made for the game, so a workout starts with the choice of a fight in it.
  await expect(page).toHaveURL('/game/fight');
  await expect(page.getByRole('heading', { level: 1, name: 'Бій' })).toBeVisible();
  // §6: the hall offers a fight of the ready-made exercises at once.
  await expect(page.getByRole('textbox', { name: 'Відтискання, раунд 1' })).toHaveValue('10');
  await expect(page.getByRole('button', { name: /^До бою/ })).toBeEnabled();
  await expectAccessible(page);
});

test('an address the game does not have is a real 404', async ({ page }) => {
  const response = await page.goto('/game/unknown');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeVisible();
  await expectAccessible(page);
});

// The pages about the game share their header and lead into it; the game has a header of its own
// (§24.1). Every page has the same footer, and every screen of the game leads back by itself.
test('the game has a header of its own, the footer is everywhere and screens lead back', async ({ page }) => {
  await page.goto('/');
  const footer = await page.locator('footer.site-footer').innerHTML();
  // The header has one way into the game, a phone included: to the cossack.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Грати' })).toHaveAttribute('href', '/game');

  // §24.1: the history and the settings are sections of the game, so the footer leads there directly.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Налаштування' }).click();

  await expect(page).toHaveURL('/game/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Налаштування' })).toBeVisible();
  expect(await page.locator('footer.site-footer').innerHTML()).toBe(footer);
  // Inside the game the header tells the energy of the cossack and repeats none of its sections.
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', { name: 'Енергія боїв: 10 з 10' })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Енергія походу: 6 з 6' })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Грати' })).toHaveCount(0);
  await expectAccessible(page);

  await banner.getByRole('link', { name: 'Енергія боїв: 10 з 10' }).click();
  await expect(page).toHaveURL('/game/fight');
  // The cossack is a section of the game, and the logo leads home as on every page.
  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Козак' }).click();
  await expect(page).toHaveURL('/game');
  // The header of the game is the band of the site, so its logo and its divider stay in place from page
  // to page, a phone included.
  const logo = banner.getByRole('link', { name: 'Self-Fighter' });
  const band = async () => ({
    logo: await logo.boundingBox(),
    divider: await banner.evaluate((header) => header.getBoundingClientRect().bottom),
  });
  const inGame = await band();
  await logo.click();
  await expect(page).toHaveURL('/');
  await expect(banner.getByRole('link', { name: 'Грати' })).toBeVisible();
  expect(await band()).toEqual(inGame);
});
