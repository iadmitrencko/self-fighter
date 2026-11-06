import { expect, test } from '@playwright/test';
import { enter, expectAccessible, field } from './helpers';

// §21.3: a ready-made challenge is useful as a page, opens in the game with its settings filled in,
// and a win marks it as passed on every page of the site.
test('a ready-made challenge opens in the game and a win marks it as passed', async ({ page }) => {
  const score = page.getByRole('region', { name: 'Твій рахунок' });
  await page.goto('/challenges');
  await expect(page.getByRole('heading', { level: 1, name: 'Готові виклики' })).toBeVisible();
  // §14.2: a new visitor starts from zero, and reading the score creates no guest.
  await expect(score.getByRole('definition')).toHaveText(['0', '0', '0', '0', '0']);
  await expect(page.locator('.catalog-progress__value')).toHaveText('0 / 33');
  expect(await (await page.request.get('/api/v1/me')).json()).toEqual({ user: null, guest: null });
  await expectAccessible(page);

  await page.getByRole('link', { name: 'Драбина підтягувань до 3' }).click();

  await expect(page).toHaveURL('/challenges/pull-ups-ladder-to-3');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Драбина підтягувань до 3');
  await expect(page.locator('.stages__item')).toHaveText(['1', '2', '3']);
  await expectAccessible(page);

  await page.getByRole('link', { name: 'Почати виклик' }).first().click();

  await expect(page).toHaveURL('/workout/challenge/pull-ups-ladder-to-3');
  await expect(page.getByRole('heading', { level: 1, name: 'Налаштуй драбину' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Підтягування' })).toBeChecked();
  await expect(field(page, /Максимум драбини/)).toHaveValue('3');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Почати драбину' }).click();

  await enter(page, 1, 'Зафіксувати етап');
  await enter(page, 2, 'Зафіксувати етап');
  await enter(page, 3, 'Зафіксувати етап');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText('Виклик «Драбина підтягувань до 3» пройдено')).toBeVisible();
  await expect(score.getByRole('definition')).toHaveText(['1', '1', '0', '0', '1']);
  await expectAccessible(page);

  await page.goto('/challenges');

  await expect(page.locator('[data-challenge="pull-ups-ladder-to-3"]')).toHaveClass(/is-passed/);
  await expect(page.locator('[data-challenge="pull-ups-ladder-to-5"]')).not.toHaveClass(/is-passed/);
  await expect(page.locator('.catalog-progress__value')).toHaveText('1 / 33');
  await expect(score.getByRole('definition')).toHaveText(['1', '1', '0', '0', '1']);
  await expectAccessible(page);

  await page.getByRole('link', { name: 'Драбина підтягувань до 3' }).click();

  await expect(page.getByText('Пройдено ✓')).toBeVisible();
});

test('the settings of a challenge can be changed and lead back to its page', async ({ page }) => {
  await page.goto('/workout/challenge/100-squats');

  await expect(page.getByText('Налаштування заповнено з виклику. Їх можна змінити перед стартом.')).toBeVisible();
  await expect(field(page, 'Присідання, раунд 5')).toHaveValue('20');

  await field(page, 'Присідання, раунд 1').fill('15');

  await expect(field(page, 'Присідання, раунд 5')).toHaveValue('15');
  // A changed challenge is a workout of its own (§21.3).
  await expect(page.getByText('Налаштування змінено, тож перемога не зарахує виклик. Поверни значення виклику, щоб його пройти.')).toBeVisible();

  await page.getByRole('link', { name: 'До сторінки виклику' }).click();

  await expect(page).toHaveURL('/challenges/100-squats');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('100 присідань');
});

// Stage 7 of the plan: the choice of a mode leads to the catalog.
test('the game leads to the catalog of challenges', async ({ page }) => {
  await page.goto('/workout');
  await page.getByRole('link', { name: 'Обери готовий виклик' }).click();

  await expect(page).toHaveURL('/challenges');
});

// §21.2: the pages of content pass axe like the screens of the game.
test('the pages of content are accessible', async ({ page }) => {
  for (const path of ['/exercises', '/exercises/push-ups', '/modes', '/modes/ladder', '/guides/ladder-training', '/about', '/challenges/full-body-workout-medium']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  }
});
