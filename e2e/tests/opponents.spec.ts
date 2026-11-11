import { expect, test, type Page } from '@playwright/test';
import { addExercises, enter, field, proceed, setRounds, targetValue } from './helpers';

async function opponentResults(page: Page, stages: number): Promise<number[]> {
  const results: number[] = [];

  for (let stage = 1; stage <= stages; stage += 1) {
    results.push(await targetValue(page));
    await enter(page, 0);

    if (stage < stages) {
      await proceed(page);
    }
  }

  return results;
}

// §18 «Режими»: the opponent gets a result for each exercise of each round and keeps it.
test('«Випадковий суперник» rolls within the range and keeps the result after a reload', async ({ page }) => {
  await page.goto('/game/fight/setup/random-opponent');
  await addExercises(page, 'Віджимання');
  await setRounds(page, 2);
  await field(page, 'Віджимання, результат суперника від').fill('3');
  await field(page, 'Віджимання, результат суперника до').fill('7');
  await page.getByRole('button', { name: 'Почати бій' }).click();

  const first = await targetValue(page);
  await page.reload();

  expect(await targetValue(page)).toBe(first);
  const results = await opponentResults(page, 2);
  expect(results.every((result) => result >= 3 && result <= 7)).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▼ Поразка');
});

// §8.3: a simple opponent does 10–50% of M; M = 10 gives 1–5.
test('«Рівні суперників» keeps a simple opponent within its share of M', async ({ page }) => {
  await page.goto('/game/fight/setup/opponent-levels');
  await addExercises(page, 'Присідання');
  await setRounds(page, 4);
  await page.getByRole('radio', { name: /Простий/ }).check();
  await field(page, 'Присідання, верхня межа M').fill('10');

  await expect(page.getByText('суперник: 1–5')).toBeVisible();
  await page.getByRole('button', { name: 'Почати бій' }).click();

  const results = await opponentResults(page, 4);
  expect(results.every((result) => result >= 1 && result <= 5)).toBe(true);
});

// §8.5: a hard opponent does 50–100% of M and sometimes up to 120%.
test('«Рівні суперників» lets a hard opponent go above M, but not beyond 120%', async ({ page }) => {
  await page.goto('/game/fight/setup/opponent-levels');
  await addExercises(page, 'Віджимання');
  await setRounds(page, 4);
  await page.getByRole('radio', { name: /Складний/ }).check();
  await field(page, 'Віджимання, верхня межа M').fill('10');
  await page.getByRole('button', { name: 'Почати бій' }).click();

  const results = await opponentResults(page, 4);
  expect(results.every((result) => result >= 5 && result <= 12)).toBe(true);
});
