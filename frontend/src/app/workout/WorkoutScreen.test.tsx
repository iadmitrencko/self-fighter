import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSession, submitResult } from '../../domain/engine/session';
import {
  ladderConfig,
  pushUps,
  randomOpponentConfig,
  squats,
  targetConfig,
  testDeps,
} from '../../domain/testing/fixtures';
import { createMemoryStorage } from '../../storage/memory';
import { renderGame } from '../testing/render';

function startedWith(config: Parameters<typeof createSession>[0]) {
  const storage = createMemoryStorage();
  const session = createSession(config, testDeps());
  storage.activeSession.save(session);

  return { storage, session };
}

describe('a fight', () => {
  // §12.3: every result is explained before the next stage, a round when it is over.
  it('shows how each exercise and round went and ends with the result', async () => {
    const { storage } = startedWith(targetConfig());
    const { user, analytics } = renderGame('/fight', { storage });

    expect(screen.getByText('Раунд 1 з 2')).toBeTruthy();
    expect(screen.getByText('Щоб виграти — більше 10')).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '11');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати результат' }));

    expect(within(screen.getByRole('status')).getByText('▲ Перемога у вправі')).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Твій результат' }).readOnly).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Наступна вправа' }));
    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '20');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати результат' }));

    expect(screen.getByRole('status').textContent).toBe(
      '▼ Поразка у вправі20 проти 20. Раунд 1: 1 перемога, 1 поразка — нічия.',
    );

    await user.click(screen.getByRole('button', { name: 'Почати раунд 2' }));

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Твій результат' }));

    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '13');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати результат' }));
    await user.click(screen.getByRole('button', { name: 'Наступна вправа' }));
    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '26');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати результат' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(storage.activeSession.load()).toBeNull();
    expect((await storage.attempts.stats()).wins).toBe(1);
    expect(analytics.events).toEqual([{ name: 'workout_completed', mode: 'target', outcome: 'win' }]);
  });

  // §12.2: whole numbers from 0, never an empty field.
  it.each(['', '1.5', '-3', 'десять'])('refuses «%s» as a result', async (input) => {
    const { storage, session } = startedWith(targetConfig());
    const { user } = renderGame('/fight', { storage });

    if (input !== '') {
      await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), input);
    }
    await user.click(screen.getByRole('button', { name: 'Зафіксувати результат' }));

    expect(screen.getByRole('alert').textContent).toBe(
      'Введи ціле число від 0 до 9999 — порожнє поле не рахується.',
    );
    expect(storage.activeSession.load()).toEqual(session);
  });

  it('counts with the buttons next to the field', async () => {
    const { storage } = startedWith(targetConfig());
    const { user } = renderGame('/fight', { storage });

    await user.click(screen.getByRole('button', { name: 'Плюс одне повторення' }));
    await user.click(screen.getByRole('button', { name: 'Плюс одне повторення' }));
    await user.click(screen.getByRole('button', { name: 'Мінус одне повторення' }));

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Твій результат' }).value).toBe('1');
  });

  // §7.3: the opponent's results are rolled once, so a reload shows the same numbers.
  it('keeps the results of the opponent after a reload', () => {
    const { storage, session } = startedWith(randomOpponentConfig());
    const view = renderGame('/fight', { storage });

    expect(screen.getByText('Суперник зробив')).toBeTruthy();
    expect(screen.getByText(String(session.stages[0]?.target))).toBeTruthy();

    view.unmount();
    renderGame('/fight', { storage, seed: 99 });

    expect(screen.getByText(String(session.stages[0]?.target))).toBeTruthy();
  });

  // §12.2: a second tap on the last result saves one attempt.
  it('saves one attempt however often the last result is confirmed', async () => {
    const config = targetConfig({
      rounds: 1,
      exercises: [
        { ...pushUps, targets: [10] },
        { ...squats, targets: [20] },
      ],
    });
    const storage = createMemoryStorage();
    storage.activeSession.save(submitResult(createSession(config, testDeps()), 0, 11));
    const save = vi.spyOn(storage.attempts, 'save');
    renderGame('/fight', { storage });

    fireEvent.change(screen.getByRole('textbox', { name: 'Твій результат' }), { target: { value: '30' } });
    const form = screen.getByRole('button', { name: 'Зафіксувати результат' }).closest('form');
    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    // A second attempt under the same id could reach the server after the first and be refused.
    expect(save).toHaveBeenCalledTimes(1);
  });

  // §12.4: an interrupted attempt does not count.
  it('asks before interrupting and saves nothing', async () => {
    const { storage } = startedWith(targetConfig());
    const { user } = renderGame('/fight', { storage });

    await user.click(screen.getByRole('button', { name: 'Перервати' }));
    const dialog = screen.getByRole('dialog', { name: 'Перервати тренування?' });
    await user.click(within(dialog).getByRole('button', { name: 'Продовжити тренування' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(storage.activeSession.load()).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Перервати' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Перервати' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeTruthy();
    expect(storage.activeSession.load()).toBeNull();
    expect((await storage.attempts.stats()).total).toBe(0);
  });

  it('shows the score of rounds for «Ціль» as won against lost', () => {
    const { storage } = startedWith(targetConfig());
    renderGame('/fight', { storage });

    expect(screen.getByText('Раундів виграно: 0, програно: 0')).toBeTruthy();
    expect(screen.getByText('Ціль', { selector: '.target-box__label' })).toBeTruthy();
  });
});

describe('a ladder', () => {
  // R2: the top step is passed by reaching it, the others by exceeding them.
  it('climbs step by step and passes the top by reaching it', async () => {
    const { storage } = startedWith(ladderConfig({ max: 2, returnDown: false }));
    const { user } = renderGame('/fight', { storage });

    expect(screen.getByRole('heading', { level: 1, name: 'Підтягування' })).toBeTruthy();
    expect(screen.getByText('Зроби більше 1')).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '2');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати етап' }));

    expect(screen.getByRole('status').textContent).toBe('Етап 1 пройдено.');
    expect(screen.getByText('Зроби 2 або більше')).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '2');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати етап' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
  });

  it('goes back down after the top', () => {
    const storage = createMemoryStorage();
    const session = createSession(ladderConfig({ max: 2, returnDown: true }), testDeps());
    storage.activeSession.save(submitResult(submitResult(session, 0, 2), 1, 2));
    renderGame('/fight', { storage });

    expect(screen.getByText('Спуск · ціль')).toBeTruthy();
    expect(screen.getByText('Етап 3 з 3')).toBeTruthy();
  });

  // §9.5: one missed step ends the ladder with a loss.
  it('ends at the first missed step', async () => {
    const { storage } = startedWith(ladderConfig());
    const { user } = renderGame('/fight', { storage });

    await user.type(screen.getByRole('textbox', { name: 'Твій результат' }), '1');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати етап' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Поразка' })).toBeTruthy();
    expect(screen.getByText('0 / 9')).toBeTruthy();
  });
});
