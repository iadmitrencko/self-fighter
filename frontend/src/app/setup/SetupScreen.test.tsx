import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ladderConfig, pullUps, pushUps, randomOpponentConfig, squats, targetConfig } from '../../domain/testing/fixtures';
import { createMemoryStorage } from '../../storage/memory';
import { renderGame } from '../testing/render';

describe('setup of a workout', () => {
  // §6.4: the first round fills the others until a round is changed by hand.
  it('starts «Ціль» with separate targets for each exercise and round', async () => {
    const { user, storage } = renderGame('/setup/target');
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

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
    expect(storage.activeSession.load()?.config).toEqual({
      mode: 'target',
      rule: 'over',
      rounds: 3,
      exercises: [{ ...pushUps, targets: [10, 15, 10] }],
    });
  });

  // §11.5: nothing starts until the setup is valid, and the problems are named.
  it('explains what keeps a workout from starting', async () => {
    const { user, storage } = renderGame('/setup/target');
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Додай хоча б одну вправу.')).toBeTruthy();
    expect(document.activeElement).toBe(alert);

    await user.click(screen.getByRole('button', { name: 'Додати вправу Присідання' }));

    expect(within(screen.getByRole('alert')).getByText('Задай ціль для кожного раунду.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Присідання, раунд 1' }).getAttribute('aria-invalid')).toBe('true');
    expect(storage.activeSession.load()).toBeNull();
  });

  it('starts from the last configuration of the mode', async () => {
    const storage = createMemoryStorage();
    await storage.settings.save(randomOpponentConfig());
    const { user } = renderGame('/setup/random-opponent', { storage });
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Присідання, результат суперника до' }).value).toBe('50');

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(storage.activeSession.load()?.config).toEqual(randomOpponentConfig());
  });

  it('shows the range of the opponent for each upper bound', async () => {
    const { user } = renderGame('/setup/opponent-levels');
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

    await user.click(screen.getByRole('button', { name: 'Додати вправу Віджимання' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, верхня межа M' }), '90');

    expect(screen.getByText('суперник: 27–63')).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: /Простий/ }));

    expect(screen.getByText('суперник: 9–45')).toBeTruthy();
  });

  // §9.2: a ladder takes one exercise.
  it('starts a ladder with one exercise and the way back down', async () => {
    const { user, storage } = renderGame('/setup/ladder');
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй драбину' });

    await user.click(screen.getByRole('radio', { name: 'Віджимання' }));
    await user.click(screen.getByRole('radio', { name: 'Підтягування' }));
    await user.click(screen.getByRole('checkbox', { name: 'Повернення вниз після максимуму' }));

    expect(screen.getByText('9 етапів: 1 → … → 1')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    expect(storage.activeSession.load()?.config).toEqual({
      mode: 'ladder',
      rule: 'over',
      exercise: pullUps,
      max: 5,
      returnDown: true,
    });
  });

  // §5.2: a custom exercise is created, renamed and deleted from the setup.
  it('keeps custom exercises in the catalog', async () => {
    const { user, storage } = renderGame('/setup/target');
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

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

  // §21.3: a ready-made challenge opens its settings filled in; they can be changed before the start.
  it('opens a ready-made challenge with its settings', async () => {
    const storage = createMemoryStorage();
    await storage.settings.save(targetConfig());
    const challenge = {
      slug: '100-push-ups',
      title: '100 віджимань',
      config: targetConfig({ rule: 'meet', rounds: 3, exercises: [{ ...pushUps, targets: [10, 10, 10] }] }),
    };
    const { user } = renderGame('/challenge/100-push-ups', { storage, challenge });
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

    expect(screen.getByText('Готовий виклик · режим «Ціль»')).toBeTruthy();
    expect(screen.getByText('100 віджимань')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'До сторінки виклику' }).getAttribute('href')).toBe('/challenges/100-push-ups');
    // The challenge wins over the last settings of the mode.
    expect(screen.queryByRole('button', { name: 'Прибрати вправу Присідання' })).toBeNull();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: /Виконати/ }).checked).toBe(true);

    await user.clear(screen.getByRole('textbox', { name: 'Віджимання, раунд 3' }));
    await user.type(screen.getByRole('textbox', { name: 'Віджимання, раунд 3' }), '12');

    // A changed challenge is a workout of its own, and the player learns it before the start.
    expect(screen.getByText('Налаштування змінено, тож перемога не зарахує виклик. Поверни значення виклику, щоб його пройти.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
    expect(storage.activeSession.load()?.config).toEqual({
      mode: 'target',
      rule: 'meet',
      rounds: 3,
      exercises: [{ ...pushUps, targets: [10, 10, 12] }],
    });
    expect(storage.activeSession.load()?.challenge).toBeNull();
  });

  // §21.3: the settings of the page take the challenge, so a win passes it.
  it('takes the challenge with the settings of its page', async () => {
    const challenge = { slug: '100-push-ups', title: '100 віджимань', config: targetConfig({ rule: 'meet', rounds: 1, exercises: [{ ...pushUps, targets: [10] }] }) };
    const { user, storage } = renderGame('/challenge/100-push-ups', { challenge });
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй бій' });

    expect(screen.getByText('Налаштування заповнено з виклику. Їх можна змінити перед стартом.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Почати бій' }));

    expect(storage.activeSession.load()?.challenge).toEqual({ slug: '100-push-ups', title: '100 віджимань' });
  });

  it('opens a ladder challenge', async () => {
    const challenge = { slug: 'pull-ups-pyramid-to-7', title: 'Піраміда підтягувань до 7', config: ladderConfig({ max: 7 }) };
    const { user, storage } = renderGame('/challenge/pull-ups-pyramid-to-7', { challenge });
    await screen.findByRole('heading', { level: 1, name: 'Налаштуй драбину' });

    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Підтягування' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Повернення вниз після максимуму' }).checked).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    expect(storage.activeSession.load()?.config).toEqual(ladderConfig({ max: 7 }));
  });

  // The page carries the challenge of its own address only.
  it('knows no other challenge than the one of the page', async () => {
    const challenge = { slug: '100-push-ups', title: '100 віджимань', config: targetConfig() };
    renderGame('/challenge/200-push-ups', { challenge });

    expect(await screen.findByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeTruthy();
  });

  it('keeps ready-made exercises when custom ones fail to load', async () => {
    const storage = createMemoryStorage();
    storage.exercises.list = () => Promise.reject(new Error('offline'));
    renderGame('/setup/target', { storage });

    expect(await screen.findByText('Не вдалося завантажити твої вправи, доступні лише готові.')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Додати вправу ${squats.name}` })).toBeTruthy();
  });
});
