import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, finishSets } from './helpers';

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

  await expect(page.getByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Як здобути славу' }).click();
  await expect(page.getByRole('region', { name: 'Як здобути славу' })).toBeVisible();
  await expectAccessible(page);
  await page.keyboard.press('Escape');

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Звання' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Звання', exact: true })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Похід' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Похід «Січ»' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('article').filter({ hasText: 'Лісові круки' }).getByRole('link', { name: 'Вирушити в кампанію' }).click();

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

  // §24.1: the history is a section of the game and names the level.
  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Історія' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Перше випробування Перемога Похід/ })).toBeVisible();
  await expectAccessible(page);

  // §24.1: the data of the player is the last section of the game.
  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Налаштування' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Налаштування' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Видалити всі дані' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Козак' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Ще 8 слави до звання «Заставний»' })).toBeVisible();
  // §24.8: the level brought the first best set of the pull-ups.
  await expect(page.getByRole('region', { name: 'Рекорди походу' }).getByRole('definition')).toHaveText([
    /ще немає/,
    /ще немає/,
    '1 за підхід',
  ]);
});

// §24.5: «Чорний прапор» opens beside «Лісові круки», with its own maps and levels.
test('the campaign «Чорний прапор» leads to its first level', async ({ page }) => {
  await page.goto('/game/journey');
  await page.getByRole('article').filter({ hasText: 'Чорний прапор' }).getByRole('link', { name: 'Вирушити в кампанію' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Чорний прапор' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Відкрити етап' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Перші напади' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Перейти до випробування' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Сліди на дорозі' })).toBeVisible();
  await expect(page.getByText('Схема 1-1-2 · 3 підходи')).toBeVisible();
  await expectAccessible(page);
});

// §24.5: «Степові вовки» opens beside the other campaigns, with the maps of the Wild Field.
test('the campaign «Степові вовки» leads to its first level', async ({ page }) => {
  await page.goto('/game/journey');
  await page.getByRole('article').filter({ hasText: 'Степові вовки' }).getByRole('link', { name: 'Вирушити в кампанію' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Степові вовки' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Відкрити етап' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Перші сліди' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Перейти до випробування' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Покинутий віз' })).toBeVisible();
  await expect(page.getByText('Схема 2-3-3 · 3 підходи')).toBeVisible();
  await expectAccessible(page);
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

// §6, §24.6: a fight is put together freely, takes energy and brings glory.
test('a fight of the game spends energy and brings glory', async ({ page }) => {
  await page.goto('/game/fight');
  await expect(page.getByRole('heading', { level: 1, name: 'Бій' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Відтискання, раунд 1' })).toHaveValue('10');
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Прибрати вправу Присідання' }).click();
  await page.getByRole('button', { name: 'Прибрати раунд 3' }).click();
  await page.getByRole('button', { name: 'Прибрати раунд 2' }).click();
  await page.getByRole('button', { name: 'Більше: Відтискання, раунд 1' }).click();
  await expect(page.getByRole('textbox', { name: 'Відтискання, раунд 1' })).toHaveValue('11');
  await expect(page.getByRole('region', { name: 'Твій бій' }).getByText('Виконано єдину клітинку.')).toBeVisible();
  await page.getByRole('button', { name: /^До бою/ }).click();

  const battle = page.getByRole('dialog', { name: 'Бій' });
  await expect(battle.getByText('1 вправа · 1 раунд')).toBeVisible();
  await expectAccessible(page);
  await finishSets(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  await expect(page.getByText('+1', { exact: true })).toBeVisible();
  await expectAccessible(page);
  await expect.poll(async () => (await gameRecord(page))?.fights).toEqual({ wins: 1, draws: 0, losses: 0 });
});
