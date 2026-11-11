import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pullUps, pushUps, randomOpponentConfig, squats } from '../../domain/testing/fixtures';
import { createMemoryStorage } from '../../storage/memory';
import { renderKozak } from '../testing/render';

// The setup shows its form once the cossack, the catalog and the last settings have loaded.
async function opened(title: string) {
  await screen.findByRole('heading', { level: 1, name: title });
  await screen.findByRole('button', { name: /^Почати (бій|драбину)$/ });
}

describe('setup of a fight', () => {
  // §6.4: the first round fills the others until a round is changed by hand.
  it('starts «Ціль» with separate targets for each exercise and round', async () => {
    const { user, storage, analytics } = renderKozak('/fight/setup/target');
    await opened('Налаштуй бій');

    await user.click(screen.getByRole('button', { name: 'Додати вправу Віджимання' }));
    await user.click(screen.getByRole('button', { name: 'Менше раундів' }));
    await user.click(screen.getByRole('button', { name: 'Менше раундів' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, раунд 1' }), '12');
    await user.clear(screen.getByRole('textbox', { name: 'Віджимання, раунд 2' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, раунд 2' }), '15');
    await user.clear(screen.getByRole('textbox', { name: 'Віджимання, раунд 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, раунд 1' }), '10');

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Віджимання, раунд 2, змінено вручну' }).value).toBe('15');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Віджимання, раунд 3' }).value).toBe('10');

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
    expect(storage.gameSessions.fight.load()?.config).toEqual({
      mode: 'target',
      rule: 'over',
      rounds: 3,
      exercises: [{ ...pushUps, targets: [10, 15, 10] }],
    });
    // §19: the start goes after the settings, which make a new player a guest.
    expect(await storage.settings.get('target')).not.toBeNull();
    await waitFor(() => expect(analytics.events).toEqual([{ name: 'workout_started', mode: 'target' }]));
  });

  // §11.5: nothing starts until the setup is valid, and the problems are named.
  it('explains what keeps a workout from starting', async () => {
    const { user, storage, analytics } = renderKozak('/fight/setup/target');
    await opened('Налаштуй бій');

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Додай хоча б одну вправу.')).toBeTruthy();
    expect(document.activeElement).toBe(alert);

    await user.click(screen.getByRole('button', { name: 'Додати вправу Присідання' }));

    expect(within(screen.getByRole('alert')).getByText('Задай ціль для кожного раунду.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Присідання, раунд 1' }).getAttribute('aria-invalid')).toBe('true');
    expect(storage.gameSessions.fight.load()).toBeNull();

    // §19: a refused start reports each kind of problem once; changing the form reports nothing.
    await user.click(screen.getByRole('button', { name: 'Додати вправу Віджимання' }));
    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(analytics.events).toEqual([
      { name: 'setup_error', mode: 'target', error: 'exercises-required' },
      { name: 'setup_error', mode: 'target', error: 'target-required' },
    ]);
  });

  it('starts from the last configuration of the mode', async () => {
    const storage = createMemoryStorage();
    await storage.settings.save(randomOpponentConfig());
    const { user } = renderKozak('/fight/setup/random-opponent', { storage });
    await opened('Налаштуй бій');

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Присідання, результат суперника до' }).value).toBe('50');

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(storage.gameSessions.fight.load()?.config).toEqual(randomOpponentConfig());
  });

  it('shows the range of the opponent for each upper bound', async () => {
    const { user } = renderKozak('/fight/setup/opponent-levels');
    await opened('Налаштуй бій');

    await user.click(screen.getByRole('button', { name: 'Додати вправу Віджимання' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, верхня межа M' }), '90');

    expect(screen.getByText('суперник: 27–63')).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: /Простий/ }));

    expect(screen.getByText('суперник: 9–45')).toBeTruthy();
  });

  // §9.2: a ladder takes one exercise.
  it('starts a ladder with one exercise and the way back down', async () => {
    const { user, storage } = renderKozak('/fight/setup/ladder');
    await opened('Налаштуй драбину');

    await user.click(screen.getByRole('radio', { name: 'Віджимання' }));
    await user.click(screen.getByRole('radio', { name: 'Підтягування' }));
    await user.click(screen.getByRole('checkbox', { name: 'Повернення вниз після максимуму' }));

    expect(screen.getByText('9 етапів: 1 → … → 1')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    expect(storage.gameSessions.fight.load()?.config).toEqual({
      mode: 'ladder',
      rule: 'over',
      exercise: pullUps,
      max: 5,
      returnDown: true,
    });
  });

  // §5.2: a custom exercise is created, renamed and deleted from the setup.
  it('keeps custom exercises in the catalog', async () => {
    const { user, storage } = renderKozak('/fight/setup/target');
    await opened('Налаштуй бій');

    await user.click(screen.getByRole('button', { name: 'Власна вправа' }));
    const create = screen.getByRole('dialog', { name: 'Власна вправа' });
    await user.type(within(create).getByRole('textbox', { name: 'Назва' }), 'віджимання');
    await user.click(within(create).getByRole('button', { name: 'Зберегти' }));

    expect(within(create).getByText('Вправа з такою назвою вже є в каталозі.')).toBeTruthy();

    await user.clear(within(create).getByRole('textbox', { name: 'Назва' }));
    await user.type(within(create).getByRole('textbox', { name: 'Назва' }), 'Бурпі');
    await user.click(within(create).getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByRole('button', { name: 'Прибрати вправу Бурпі' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Мої вправи' }));
    await user.click(screen.getByRole('button', { name: 'Змінити вправу Бурпі' }));
    const edit = screen.getByRole('dialog', { name: 'Змінити вправу' });
    await user.type(within(edit).getByRole('textbox', { name: 'Назва' }), ' зі стрибком');
    await user.click(within(edit).getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByRole('button', { name: 'Прибрати вправу Бурпі зі стрибком' })).toBeTruthy();

    const manage = screen.getByRole('dialog', { name: 'Мої вправи' });
    await user.click(within(manage).getByRole('button', { name: 'Видалити вправу Бурпі зі стрибком' }));
    await user.click(within(manage).getByRole('button', { name: 'Видалити' }));

    expect(await within(manage).findByText('Власних вправ ще немає.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Бурпі/ })).toBeNull();
    expect(await storage.exercises.list()).toEqual([]);
  });

  it('keeps ready-made exercises when custom ones fail to load', async () => {
    const storage = createMemoryStorage();
    storage.exercises.list = () => Promise.reject(new Error('offline'));
    renderKozak('/fight/setup/target', { storage });

    expect(await screen.findByText('Не вдалося завантажити твої вправи, доступні лише готові.')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Додати вправу ${squats.name}` })).toBeTruthy();
  });
});
