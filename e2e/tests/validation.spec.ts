import { expect, test } from '@playwright/test';
import { addExercises, field } from './helpers';

// §18 «Продукт», §11.5: nothing starts until the setup is valid, and the message names the problem.
test('the setup explains what keeps a workout from starting', async ({ page }) => {
  await page.goto('/workout/setup/target');
  await page.getByRole('button', { name: 'Почати бій' }).click();
  await expect(page.getByRole('alert')).toContainText('Додай хоча б одну вправу.');

  await addExercises(page, 'Віджимання');
  await expect(page.getByRole('alert')).toContainText('Задай ціль для кожного раунду.');

  await page.goto('/workout/setup/random-opponent');
  await addExercises(page, 'Присідання');
  await field(page, 'Присідання, результат суперника від').fill('8');
  await field(page, 'Присідання, результат суперника до').fill('3');
  await page.getByRole('button', { name: 'Почати бій' }).click();
  await expect(page.getByRole('alert')).toContainText('Нижня межа не може бути більшою за верхню.');

  await page.goto('/workout/setup/ladder');
  await page.getByRole('radio', { name: 'Підтягування' }).check();
  await field(page, /Максимум драбини/).fill('101');
  await page.getByRole('button', { name: 'Почати драбину' }).click();
  await expect(page.getByRole('alert')).toContainText('Максимум драбини має бути цілим числом від 1 до 100.');
  await expect(page).toHaveURL('/workout/setup/ladder');
});
