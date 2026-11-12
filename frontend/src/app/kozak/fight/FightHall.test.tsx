import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '../../../domain/engine/session';
import { fightConfig, pullUps, pushUps, squats, testDeps } from '../../../domain/testing/fixtures';
import { createMemoryStorage } from '../../../storage/memory';
import { gameFight } from '../../../storage/testing/attempts';
import { renderKozak } from '../../testing/render';

// Ten fights the hour before the clock of the tests (10:00): the first unit comes back at 11:00.
async function spentFights() {
  const storage = createMemoryStorage();

  for (let fight = 0; fight < 10; fight += 1) {
    const minute = String(fight).padStart(2, '0');
    const fullAt = new Date(Date.parse('2026-10-30T11:00:00.000Z') + fight * 2 * 3_600_000).toISOString();
    await storage.attempts.save(gameFight('loss', `2026-10-30T09:${minute}:00.000Z`, fullAt));
  }

  return storage;
}

// The hall once the fight it puts together is on the screen.
async function hall() {
  await screen.findByRole('button', { name: /^До бою/ });

  return within(screen.getByRole('region', { name: 'Сітка бою' }));
}

function cell(name: string): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

describe('the hall of fights', () => {
  // §6: a new player starts with the first ready-made exercises in three rounds.
  it('puts a new player in front of a fight of the ready-made exercises', async () => {
    renderKozak('/fight');

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
    const grid = await hall();
    expect(grid.getAllByRole('textbox').map((field) => (field as HTMLInputElement).value)).toEqual(['10', '10', '10', '10', '10', '10']);
    expect(cell('Віджимання, раунд 1')).toBeTruthy();
    expect(cell('Присідання, раунд 3')).toBeTruthy();
    const summary = within(screen.getByRole('region', { name: 'Твій бій' }));
    expect(summary.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['2 вправи', '3 раунди', '60 повторів']);
    expect(summary.getByText('Виконано всі 6 клітинок.')).toBeTruthy();
    expect(summary.getByText('+1 слава козаку')).toBeTruthy();
    expect(screen.getAllByText('10 з 10').length).toBeGreaterThan(0);
  });

  // §6: the rounds and the repetitions change freely, within the limits.
  it('lets the player put the fight together', async () => {
    const { user } = renderKozak('/fight');
    const grid = await hall();

    await user.click(grid.getByRole('button', { name: 'Більше: Віджимання, раунд 1' }));
    await user.click(grid.getByRole('button', { name: 'Менше: Присідання, раунд 3' }));

    expect([cell('Віджимання, раунд 1').value, cell('Присідання, раунд 3').value]).toEqual(['11', '9']);

    // A new round repeats the last one.
    await user.click(grid.getByRole('button', { name: 'Додати раунд' }));

    expect([cell('Віджимання, раунд 4').value, cell('Присідання, раунд 4').value]).toEqual(['10', '9']);

    await user.click(grid.getByRole('button', { name: 'Прибрати раунд 2' }));

    expect(grid.getAllByRole('textbox')).toHaveLength(6);
    expect(grid.queryByRole('textbox', { name: 'Віджимання, раунд 4' })).toBeNull();

    // A number can be typed in as well; it stays within the limits.
    await user.clear(cell('Віджимання, раунд 2'));
    await user.type(cell('Віджимання, раунд 2'), '25');
    await user.tab();
    await user.clear(cell('Присідання, раунд 1'));
    await user.type(cell('Присідання, раунд 1'), '0');
    await user.tab();

    expect([cell('Віджимання, раунд 2').value, cell('Присідання, раунд 1').value]).toEqual(['25', '1']);
    expect(grid.getByText(/^Разом Віджимання/).closest('p')?.textContent).toBe('Разом Віджимання: 46');
    expect(grid.getByText(/^Разом за раунд 1/).closest('p')?.textContent).toBe('Σ Разом за раунд 1: 12');
    expect(grid.getByRole('button', { name: 'Менше: Присідання, раунд 1' })).toHaveProperty('disabled', true);

    await user.click(grid.getByRole('button', { name: 'Прибрати вправу Присідання' }));

    expect(grid.queryByRole('textbox', { name: /^Присідання/ })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Твій бій' })).getByText('Виконано всі 3 клітинки.')).toBeTruthy();
  });

  // §5: the catalog and the custom exercises give the rows of the fight.
  it('adds an exercise of the catalog and a custom one', async () => {
    const { user, storage } = renderKozak('/fight');
    await hall();

    await user.click(screen.getByRole('button', { name: 'Додати вправу' }));
    const pick = within(screen.getByRole('dialog', { name: 'Додати вправу' }));
    expect(pick.queryByRole('button', { name: 'Віджимання' })).toBeNull();
    await user.click(pick.getByRole('button', { name: 'Підтягування' }));

    expect(cell('Підтягування, раунд 3').value).toBe('10');
    expect(screen.queryByRole('dialog')).toBeNull();

    // The choice closes without a new row, by a tap as well as by Escape.
    await user.click(screen.getByRole('button', { name: 'Додати вправу' }));
    expect(within(screen.getByRole('dialog', { name: 'Додати вправу' })).getByText('Усі вправи каталогу вже в бою. Додай власну.')).toBeTruthy();
    await user.click(within(screen.getByRole('dialog', { name: 'Додати вправу' })).getByRole('button', { name: 'Закрити' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Додати вправу' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Додати вправу' })).getByRole('button', { name: 'Власна вправа' }));
    const form = within(screen.getByRole('dialog', { name: 'Власна вправа' }));
    await user.type(form.getByRole('textbox', { name: 'Назва' }), 'Бурпі');
    await user.click(form.getByRole('button', { name: 'Зберегти' }));

    expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Бурпі, раунд 1' })).value).toBe('10');
    expect(await storage.exercises.list()).toMatchObject([{ name: 'Бурпі' }]);
  });

  // §6, §24.4: the start takes a unit of energy, and the next fight starts from this one.
  it('starts the fight and keeps it for the next time', async () => {
    const { user, storage, analytics } = renderKozak('/fight');
    await hall();

    await user.click(screen.getByRole('button', { name: /^До бою/ }));

    expect(await screen.findByRole('dialog', { name: 'Бій' })).toBeTruthy();
    const session = storage.gameSessions.fight.load();
    const config = {
      mode: 'fight',
      exercises: [
        { ...pushUps, sets: [10, 10, 10] },
        { ...squats, sets: [10, 10, 10] },
      ],
    };
    expect(session?.game?.pool).toBe('fight');
    expect(session?.config).toEqual(config);
    // §19: the start goes after the settings, which make a new player a guest.
    await waitFor(() => expect(analytics.events).toEqual([{ name: 'workout_started', mode: 'fight' }]));
    expect(await storage.settings.get('fight')).toEqual(config);
  });

  it('brings the last fight back', async () => {
    const storage = createMemoryStorage();
    await storage.settings.save(fightConfig({ exercises: [{ ...pullUps, sets: [3, 5] }] }));
    renderKozak('/fight', { storage });
    await hall();

    expect([cell('Підтягування, раунд 1').value, cell('Підтягування, раунд 2').value]).toEqual(['3', '5']);
    expect(screen.queryByRole('textbox', { name: /^Віджимання/ })).toBeNull();
  });

  it('starts no fight without an exercise', async () => {
    const { user } = renderKozak('/fight');
    const grid = await hall();

    await user.click(grid.getByRole('button', { name: 'Прибрати вправу Віджимання' }));
    await user.click(grid.getByRole('button', { name: 'Прибрати вправу Присідання' }));

    expect(screen.getByText('Додай хоча б одну вправу.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^До бою/ })).toHaveProperty('disabled', true);
    // The rounds stay for the next exercise.
    expect(grid.getByRole('button', { name: 'Прибрати раунд 3' })).toBeTruthy();
  });

  // §24.4: without energy the hall waits.
  it('waits for the energy to come back', async () => {
    renderKozak('/fight', { storage: await spentFights() });

    expect(await screen.findByRole('button', { name: 'Енергія боїв вичерпалася' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Енергії немає. Наступна одиниця через 1 год.')).toBeTruthy();
  });

  it('offers the fight in progress back and starts no second one', async () => {
    const storage = createMemoryStorage();
    const first = createSession(fightConfig(), testDeps());
    storage.gameSessions.fight.save(first);
    const { user } = renderKozak('/fight', { storage });
    await hall();

    expect(screen.getByRole('heading', { name: 'Незавершений бій' })).toBeTruthy();
    expect(screen.getByText('Виконано 0 з 6 підходів')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Продовжити бій' }).getAttribute('href')).toBe('/fight/battle');

    await user.click(screen.getByRole('button', { name: /^До бою/ }));

    expect(screen.getByRole('alert').textContent).toContain('незавершений бій');
    expect(storage.gameSessions.fight.load()).toEqual(first);
  });

  it('keeps the ready-made exercises when custom ones fail to load', async () => {
    const storage = createMemoryStorage();
    storage.exercises.list = () => Promise.reject(new Error('offline'));
    renderKozak('/fight', { storage });

    expect(await screen.findByText('Не вдалося завантажити твої вправи, доступні лише готові.')).toBeTruthy();
    expect(cell('Віджимання, раунд 1')).toBeTruthy();
  });
});
