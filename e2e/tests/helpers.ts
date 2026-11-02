import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

// Every screen passes axe: the rules of WCAG 2.2 AA and the best practices (section 7 of the plan).
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

export function field(page: Page, name: string | RegExp): Locator {
  return page.getByRole('textbox', { name, exact: typeof name === 'string' });
}

// Five rounds by default (§4.2), so fewer rounds are taken away one by one.
export async function setRounds(page: Page, rounds: number): Promise<void> {
  for (let current = 5; current > rounds; current -= 1) {
    await page.getByRole('button', { name: 'Менше раундів' }).click();
  }
  await expect(page.locator('.stepper__value')).toHaveText(String(rounds));
}

export async function addExercises(page: Page, ...names: string[]): Promise<void> {
  for (const name of names) {
    await page.getByRole('button', { name: `Додати вправу ${name}` }).click();
  }
}

// Enters a result and confirms it, as the player does after each exercise.
export async function enter(page: Page, reps: number, button = 'Зафіксувати результат'): Promise<void> {
  await field(page, 'Твій результат').fill(String(reps));
  await page.getByRole('button', { name: button }).click();
}

// After the feedback of an exercise the next stage waits for the player (§12.3).
export async function proceed(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Наступна вправа|Почати раунд \d+)$/ }).click();
  // The same tap must not send the form of the next stage.
  await expect(page.getByRole('alert')).toHaveCount(0);
}

export async function targetValue(page: Page): Promise<number> {
  return Number(await page.locator('.target-box__value').textContent());
}

// One exercise, one round: the shortest «Ціль» there is.
export async function playShortTarget(page: Page, reps: number, target = 5): Promise<void> {
  await page.goto('/workout/setup/target');
  await addExercises(page, 'Віджимання');
  await setRounds(page, 1);
  await field(page, 'Віджимання, раунд 1').fill(String(target));
  await page.getByRole('button', { name: 'Почати бій' }).click();
  await enter(page, reps);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(reps > target ? '▲ Перемога' : '▼ Поразка');
}

export async function savedAttempts(page: Page): Promise<number> {
  const response = await page.request.get('/api/v1/attempts');

  return response.ok() ? ((await response.json()) as { items: unknown[] }).items.length : 0;
}
