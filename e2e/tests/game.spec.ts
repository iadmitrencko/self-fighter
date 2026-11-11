import { expect, test, type Page } from '@playwright/test';
import { enter, expectAccessible, field } from './helpers';

interface GameRecord {
  fights: { wins: number; draws: number; losses: number };
  campaign: { wins: number; draws: number; losses: number };
  passed: string[];
  energy: { fight: string | null; campaign: string | null };
}

async function gameRecord(page: Page): Promise<GameRecord | null> {
  const response = await page.request.get('/api/v1/game');

  return response.ok() ? ((await response.json()) as GameRecord) : null;
}

// §24: the cossack game opens from the menu, and its first level is played to the end.
test('the first level of the journey is won and brings glory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Головна навігація' }).getByRole('link', { name: 'Гра' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Джура' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Похід' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Похід «Січ»' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Вирушити в кампанію' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Лісові круки' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Відкрити етап' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Перші сліди' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Перейти до випробування' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Перше випробування' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Почати випробування' }).click();

  const battle = page.getByRole('dialog', { name: 'Перше випробування' });
  await expect(battle).toBeVisible();
  await expectAccessible(page);

  for (let set = 0; set < 3; set += 1) {
    await battle.getByRole('button', { name: 'Підхід виконано' }).click();
  }
  await expect(battle.getByText('Усі підходи виконано')).toBeVisible();
  await battle.getByRole('button', { name: 'Завершити тренування' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Розбійника схоплено' })).toBeVisible();
  await expectAccessible(page);
  await expect.poll(async () => (await gameRecord(page))?.passed).toEqual(['forest-ravens/1/1']);

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Козак' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Джура' })).toBeVisible();
  await expect(page.getByText('Ще 8 слави до звання «Заставний»').first()).toBeVisible();
});

// §24.5: a retreat loses the level and keeps it open for another try.
test('a retreat from a level is a defeat', async ({ page }) => {
  await page.goto('/game/journey/forest-ravens/1/1');
  await page.getByRole('button', { name: 'Почати випробування' }).click();

  const battle = page.getByRole('dialog', { name: 'Перше випробування' });
  await battle.getByRole('button', { name: 'Підхід виконано' }).click();
  await battle.getByRole('button', { name: 'Завершити' }).click();
  await page.getByRole('dialog', { name: 'Відступити з бою?' }).getByRole('button', { name: 'Відступити' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Цього разу ворог устояв' })).toBeVisible();
  await expectAccessible(page);
  await expect.poll(async () => (await gameRecord(page))?.campaign).toEqual({ wins: 0, draws: 0, losses: 1 });
  await expect(page.getByRole('link', { name: 'Спробувати ще раз' })).toBeVisible();
});

// §24.6: a fight of the game is a workout of the site that takes energy and brings glory.
test('a fight of the game spends energy and brings glory', async ({ page }) => {
  await page.goto('/game/fight');
  await expect(page.getByRole('heading', { level: 1, name: 'Бій' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('radio', { name: 'Драбина' }).check();
  await page.getByRole('link', { name: 'До налаштування бою' }).click();

  await page.getByRole('radio', { name: 'Підтягування' }).check();
  await field(page, /Максимум драбини/).fill('1');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await enter(page, 1, 'Зафіксувати етап');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText('+1 слава')).toBeVisible();
  await expectAccessible(page);
  await expect.poll(async () => (await gameRecord(page))?.fights).toEqual({ wins: 1, draws: 0, losses: 0 });
});
