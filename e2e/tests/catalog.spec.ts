import { expect, test } from '@playwright/test';
import { enter, field, setRounds } from './helpers';

// §18 «Продукт»: one catalog for every mode, custom exercises are created and edited;
// §5.3: the history and «Повторити» keep the name an exercise had.
test('custom exercises are created, reused, renamed and deleted', async ({ page }) => {
  await page.goto('/workout/setup/target');
  await page.getByRole('button', { name: 'Власна вправа' }).click();
  const create = page.getByRole('dialog', { name: 'Власна вправа' });
  await create.getByRole('textbox', { name: 'Назва' }).fill('Бурпі');
  await create.getByRole('textbox', { name: 'Опис, якщо потрібен' }).fill('Зі стрибком угору');
  await create.getByRole('button', { name: 'Зберегти' }).click();

  await expect(page.getByRole('button', { name: 'Прибрати вправу Бурпі' })).toBeVisible();
  await setRounds(page, 1);
  await field(page, 'Бурпі, раунд 1').fill('5');
  await page.getByRole('button', { name: 'Почати бій' }).click();
  await enter(page, 6);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('▲ Перемога');

  await page.goto('/workout/setup/random-opponent');
  await expect(page.getByRole('button', { name: 'Додати вправу Бурпі' })).toBeVisible();
  await page.getByRole('button', { name: 'Мої вправи' }).click();
  await page.getByRole('button', { name: 'Змінити вправу Бурпі' }).click();
  const edit = page.getByRole('dialog', { name: 'Змінити вправу' });
  await edit.getByRole('textbox', { name: 'Назва' }).fill('Бурпі з віджиманням');
  await edit.getByRole('button', { name: 'Зберегти' }).click();

  const manage = page.getByRole('dialog', { name: 'Мої вправи' });
  await expect(manage.getByText('Бурпі з віджиманням')).toBeVisible();
  await manage.getByRole('button', { name: 'Видалити вправу Бурпі з віджиманням' }).click();
  await manage.getByRole('button', { name: 'Видалити', exact: true }).click();
  await expect(manage.getByText('Власних вправ ще немає.')).toBeVisible();
  await manage.getByRole('button', { name: 'Закрити' }).click();
  await expect(page.getByRole('button', { name: /Бурпі/ })).toHaveCount(0);

  await page.goto('/game/history');
  await page.getByRole('link', { name: /^Ціль/ }).click();
  await expect(page.getByRole('rowheader', { name: 'Бурпі' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторити' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Бурпі' })).toBeVisible();
});
