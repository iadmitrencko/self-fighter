import { expect, test } from '@playwright/test';
import { addExercises, enter, expectAccessible, field, proceed, setRounds, targetValue } from './helpers';

// §18 «Режими»: «Ціль» has its own target for each exercise in each round, and filling the
// rounds automatically never overwrites a round changed by hand. With «Виконати» the target is enough.
test('«Ціль» keeps separate targets and wins by reaching them', async ({ page }) => {
  await page.goto('/workout/setup/target');
  await addExercises(page, 'Віджимання', 'Присідання');
  await setRounds(page, 2);

  await field(page, 'Віджимання, раунд 1').fill('10');
  await expect(field(page, 'Віджимання, раунд 2')).toHaveValue('10');
  await field(page, 'Віджимання, раунд 2').fill('12');
  await field(page, 'Віджимання, раунд 1').fill('11');
  await expect(field(page, 'Віджимання, раунд 2, змінено вручну')).toHaveValue('12');
  await field(page, 'Присідання, раунд 1').fill('20');
  await page.getByRole('radio', { name: /^Виконати/ }).check();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Почати бій' }).click();

  expect(await targetValue(page)).toBe(11);
  await expectAccessible(page);
  await enter(page, 11);
  await expect(page.getByRole('status')).toContainText('▲ Перемога у вправі');
  await proceed(page);
  expect(await targetValue(page)).toBe(20);
  await enter(page, 19);
  await expect(page.getByRole('status')).toContainText('Раунд 1: 1 перемога, 1 поразка — нічия.');
  await proceed(page);
  expect(await targetValue(page)).toBe(12);
  await enter(page, 12);
  await proceed(page);
  expect(await targetValue(page)).toBe(20);
  await enter(page, 20);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');
  await expect(page.getByText('1 : 0', { exact: true })).toBeVisible();
  await expectAccessible(page);
});

// §4.4: «Перевиконати» asks for more than the target.
test('with «Перевиконати» reaching the target is not enough', async ({ page }) => {
  await page.goto('/workout/setup/target');
  await addExercises(page, 'Присідання');
  await setRounds(page, 1);
  await field(page, 'Присідання, раунд 1').fill('10');
  await page.getByRole('button', { name: 'Почати бій' }).click();

  await expect(page.getByText('Щоб виграти — більше 10')).toBeVisible();
  await enter(page, 10);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▼ Поразка');
});
