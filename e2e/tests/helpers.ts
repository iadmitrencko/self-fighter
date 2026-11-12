import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Every screen passes axe: the rules of WCAG 2.2 AA and the best practices (section 7 of the plan).
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

// §6: says every set of the fight on the screen is done and ends it.
export async function finishSets(page: Page): Promise<void> {
  const battle = page.getByRole('dialog', { name: 'Бій' });
  const sets = Number(await battle.getByRole('progressbar', { name: 'Підходи' }).getAttribute('aria-valuemax'));

  for (let set = 0; set < sets; set += 1) {
    await battle.getByRole('button', { name: 'Підхід виконано' }).click();
  }
  await expect(battle.getByText('Усі підходи виконано')).toBeVisible();
  await battle.getByRole('button', { name: 'Завершити тренування' }).click();
}

// §6: the fight the hall offers, every set done, or left at once, which loses it (§24.6).
export async function playFight(page: Page, outcome: 'win' | 'loss' = 'win'): Promise<void> {
  await page.goto('/game/fight');
  await page.getByRole('button', { name: /^До бою/ }).click();
  const battle = page.getByRole('dialog', { name: 'Бій' });
  await expect(battle).toBeVisible();

  if (outcome === 'win') {
    await finishSets(page);
  } else {
    await battle.getByRole('button', { name: 'Завершити', exact: true }).click();
    await page.getByRole('dialog', { name: 'Відступити з бою?' }).getByRole('button', { name: 'Відступити' }).click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(outcome === 'win' ? 'Бій виграно' : 'Бій програно');
}

export async function savedAttempts(page: Page): Promise<number> {
  const response = await page.request.get('/api/v1/attempts');

  return response.ok() ? ((await response.json()) as { items: unknown[] }).items.length : 0;
}
