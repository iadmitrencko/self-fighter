import { expect, test } from '@playwright/test';
import { finishSets } from './helpers';

// §18 «Продукт»: one catalog for every fight, custom exercises are created and edited;
// §5.3: the history and «Повторити» keep the name an exercise had.
test('custom exercises are created, used, renamed and deleted', async ({ page }) => {
  await page.goto('/game/fight');
  await page.getByRole('button', { name: 'Додати вправу' }).click();
  await page.getByRole('dialog', { name: 'Додати вправу' }).getByRole('button', { name: 'Власна вправа' }).click();
  const create = page.getByRole('dialog', { name: 'Власна вправа' });
  await create.getByRole('textbox', { name: 'Назва' }).fill('Бурпі');
  await create.getByRole('textbox', { name: 'Опис, якщо потрібен' }).fill('Зі стрибком угору');
  await create.getByRole('button', { name: 'Зберегти' }).click();

  await expect(page.getByRole('textbox', { name: 'Бурпі, раунд 1' })).toHaveValue('10');
  await page.getByRole('button', { name: 'Прибрати вправу Відтискання' }).click();
  await page.getByRole('button', { name: 'Прибрати вправу Присідання' }).click();
  await page.getByRole('button', { name: /^До бою/ }).click();
  await finishSets(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');

  // The hall brings the last fight back, and the catalog changes it.
  await page.goto('/game/fight');
  await expect(page.getByRole('textbox', { name: 'Бурпі, раунд 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Додати вправу' }).click();
  await page.getByRole('dialog', { name: 'Додати вправу' }).getByRole('button', { name: 'Мої вправи' }).click();
  await page.getByRole('button', { name: 'Змінити вправу Бурпі' }).click();
  const edit = page.getByRole('dialog', { name: 'Змінити вправу' });
  await edit.getByRole('textbox', { name: 'Назва' }).fill('Бурпі з відтисканням');
  await edit.getByRole('button', { name: 'Зберегти' }).click();

  const manage = page.getByRole('dialog', { name: 'Мої вправи' });
  await expect(manage.getByText('Бурпі з відтисканням')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Бурпі з відтисканням, раунд 1' })).toBeAttached();
  await manage.getByRole('button', { name: 'Видалити вправу Бурпі з відтисканням' }).click();
  await manage.getByRole('button', { name: 'Видалити', exact: true }).click();
  await expect(manage.getByText('Власних вправ ще немає.')).toBeVisible();
  await manage.getByRole('button', { name: 'Закрити' }).click();
  await page.getByRole('dialog', { name: 'Додати вправу' }).getByRole('button', { name: 'Закрити' }).click();
  await expect(page.getByRole('textbox', { name: /^Бурпі/ })).toHaveCount(0);

  await page.goto('/game/history');
  await page.getByRole('link', { name: /^Бурпі/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Бій виграно');
  await expect(page.getByRole('region', { name: 'Підходи бою' }).getByText('Бурпі')).toBeVisible();
  await page.getByRole('button', { name: /^Повторити/ }).click();
  await expect(page.getByRole('dialog', { name: 'Бій' }).getByText('Бурпі', { exact: true })).toBeVisible();
});
