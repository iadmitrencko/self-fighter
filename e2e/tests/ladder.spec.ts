import { expect, test } from '@playwright/test';
import { enter, expectAccessible, field } from './helpers';

// §18 «Режими»: one exercise per attempt and a plain climb. R2: the top is passed by reaching it.
test('a ladder takes one exercise and climbs to its top', async ({ page }) => {
  await page.goto('/workout/setup/ladder');
  await page.getByRole('radio', { name: 'Віджимання' }).check();
  await page.getByRole('radio', { name: 'Підтягування' }).check();

  await expect(page.getByRole('radio', { name: 'Віджимання' })).not.toBeChecked();
  await field(page, /Максимум драбини/).fill('3');
  await expect(page.getByText('3 етапи: 1 → 2 → 3')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Почати драбину' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Підтягування' })).toBeVisible();
  await expect(page.getByText('Зроби більше 1')).toBeVisible();
  await expectAccessible(page);
  await enter(page, 2, 'Зафіксувати етап');
  await expect(page.getByText('Зроби більше 2')).toBeVisible();
  await enter(page, 3, 'Зафіксувати етап');
  await expect(page.getByText('Зроби 3 або більше')).toBeVisible();
  await enter(page, 3, 'Зафіксувати етап');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText('3 / 3', { exact: true })).toBeVisible();
  await expectAccessible(page);
});

// §18 «Режими»: up to the top and back down.
test('a ladder goes back down after its top', async ({ page }) => {
  await page.goto('/workout/setup/ladder');
  await page.getByRole('radio', { name: 'Присідання' }).check();
  await field(page, /Максимум драбини/).fill('2');
  await page.getByRole('checkbox', { name: 'Повернення вниз після максимуму' }).check();
  await page.getByRole('button', { name: 'Почати драбину' }).click();

  await enter(page, 2, 'Зафіксувати етап');
  await enter(page, 2, 'Зафіксувати етап');
  await expect(page.getByText('Спуск · ціль')).toBeVisible();
  await enter(page, 2, 'Зафіксувати етап');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText('Повернення вниз').locator('xpath=following-sibling::dd')).toHaveText('так');
});
