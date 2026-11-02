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
