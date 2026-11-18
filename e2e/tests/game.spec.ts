import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, finishSets, googleAccount, openSection, openSignedIn, signIn } from './helpers';

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

// §24: the cossack game opens from the header, and its first level is played to the end.
test('the first level of the journey is won and brings glory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Грати' }).click();

  // §23.1: the game needs an account, so it asks to sign in and comes back to the cossack.
  await expect(page.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeVisible();
  await expectAccessible(page);
  await signIn(page, googleAccount(''));

  await expect(page.getByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeVisible();
  // §24.11: a cossack without a name asks the player for one over the rank.
  await expect(page.getByText('Як звати тебе, козаче? Напиши своє ім’я.')).toBeVisible();
  await expectAccessible(page);

  // §24.2: the next rank leads to all the ranks and what brings glory.
  await page.getByRole('link', { name: /^Ще 10 слави до звання\s«Заставний»$/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Звання', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Як здобути славу' })).toBeVisible();
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
  await battle.getByRole('button', { name: 'Завершити бій' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Розбійника схоплено' })).toBeVisible();
  await expectAccessible(page);
  await expect.poll(async () => (await gameRecord(page))?.passed).toEqual(['forest-ravens/1/1']);

  // §24.1: the history is a section of the game and names the level.
  await openSection(page, 'Історія');
  await expect(page.getByRole('heading', { level: 1, name: 'Історія' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Перше випробування Перемога Похід/ })).toBeVisible();
  await expectAccessible(page);

  // §24.1: the data of the player waits in the menu of the player.
  await openSection(page, 'Налаштування');
  await expect(page.getByRole('heading', { level: 1, name: 'Налаштування' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Видалити всі дані' })).toBeVisible();
  await expectAccessible(page);
  // §24.11: the player names the cossack.
  await page.getByRole('textbox', { name: 'Ім’я або псевдонім' }).fill('Іван Сірко');
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ім’я козака збережено.' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Розділи гри' }).getByRole('link', { name: 'Козак' }).click();
  // Chromium puts a space after the block of the name, before its hidden comma; a screen reader keeps quiet about it.
  await expect(page.getByRole('heading', { level: 1, name: /^Іван Сірко ?, Звання: Джура$/ })).toBeVisible();
  // A cossack with a name is not asked for one again.
  await expect(page.getByText('Як звати тебе, козаче?')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^Ще 8 слави до звання\s«Заставний»$/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Поступ до звання «Заставний»' })).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('region', { name: 'Бойовий рахунок' }).getByRole('listitem')).toHaveText(['1 перемога', '0 нічиїх', '0 поразок']);
  // §24.10: the level brought three pull-ups, one in each set, today; §24.12: and the first day of a run.
  await expect(page.getByRole('table', { name: 'Статистика' }).getByRole('row', { name: /^Підтягування/ }).getByRole('cell')).toHaveText(['1', '3', '3']);
  await expect(page.getByText('1 день поспіль')).toBeVisible();
  // §24.10: the exercise of the table switches the chart to itself alone.
  const pullUps = page.getByRole('table', { name: 'Статистика' }).getByRole('button', { name: 'Підтягування' });
  await pullUps.click();
  await expect(pullUps).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Підтягування за 7 днів' }).getByRole('button', { name: 'Усі вправи' })).toBeVisible();
  await expectAccessible(page);
});

// §24.5: «Чорний прапор» opens beside «Лісові круки», with its own maps and levels.
test('the campaign «Чорний прапор» leads to its first level', async ({ page }) => {
  await openSignedIn(page, '/game/journey');
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
  await openSignedIn(page, '/game/journey');
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
  await openSignedIn(page, '/game/journey/forest-ravens/1/1');
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
  await openSignedIn(page, '/game/fight');
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
