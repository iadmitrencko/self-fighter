import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

// §18 «Продукт»: the landing explains the concept and the game starts without signing up.
test('the landing explains the game and opens it without signing up', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Перетвори тренування на гру.');
  await expect(page.locator('#modes h3')).toHaveText(['Ціль', 'Випадковий суперник', 'Рівні суперників', 'Драбина']);
  await expectAccessible(page);

  await page.getByRole('main').getByRole('link', { name: 'Почати тренування' }).first().click();

  await expect(page).toHaveURL('/workout');
  await expect(page.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expectAccessible(page);
});

test('an address the game does not have is a real 404', async ({ page }) => {
  const response = await page.goto('/workout/unknown');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeVisible();
  await expectAccessible(page);
});

// Every page has the same header and footer, and every screen of the game leads back by itself.
test('the header and the footer are the same everywhere and screens lead back', async ({ page }) => {
  await page.goto('/');
  const header = await page.locator('header.site-header').innerHTML();
  const footer = await page.locator('footer.site-footer').innerHTML();

  await page.getByRole('navigation', { name: 'Головна навігація' }).getByRole('link', { name: 'Історія' }).click();

  await expect(page).toHaveURL('/workout/history');
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  expect(await page.locator('header.site-header').innerHTML()).toBe(header);
  expect(await page.locator('footer.site-footer').innerHTML()).toBe(footer);
  await expectAccessible(page);

  await page.getByRole('link', { name: 'До вибору режиму' }).click();
  await expect(page).toHaveURL('/workout');
  await page.getByRole('link', { name: 'На головну' }).click();
  await expect(page).toHaveURL('/');
});
