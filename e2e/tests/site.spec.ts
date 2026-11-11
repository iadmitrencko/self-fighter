import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

// §18 «Продукт»: the landing explains the concept and the game starts without signing up.
test('the landing explains the game and opens it without signing up', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Перетвори тренування на гру.');
  await expect(page.locator('#modes h3')).toHaveText(['Ціль', 'Випадковий суперник', 'Рівні суперників', 'Драбина']);
  await expectAccessible(page);

  await page.getByRole('main').getByRole('link', { name: 'Почати тренування' }).first().click();

  // §24.1: everything is made for the game, so a workout starts with the choice of a fight in it.
  await expect(page).toHaveURL('/game/fight');
  await expect(page.getByRole('heading', { level: 1, name: 'Бій' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expectAccessible(page);
});

test('an address the game does not have is a real 404', async ({ page }) => {
  const response = await page.goto('/game/unknown');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeVisible();
  await expectAccessible(page);
});

// Every page has the same header and footer, and every screen of the game leads back by itself.
test('the header and the footer are the same everywhere and screens lead back', async ({ page }) => {
  await page.goto('/');
  const header = await page.locator('header.site-header').innerHTML();
  const footer = await page.locator('footer.site-footer').innerHTML();

  // §24.1: the history and the settings are sections of the game, so the footer leads there directly.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Налаштування' }).click();

  await expect(page).toHaveURL('/game/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Налаштування' })).toBeVisible();
  expect(await page.locator('header.site-header').innerHTML()).toBe(header);
  expect(await page.locator('footer.site-footer').innerHTML()).toBe(footer);
  await expectAccessible(page);

  await page.goto('/game/fight/setup/ladder');
  expect(await page.locator('header.site-header').innerHTML()).toBe(header);
  await page.getByRole('link', { name: 'До вибору бою' }).click();
  await expect(page).toHaveURL('/game/fight');
});
