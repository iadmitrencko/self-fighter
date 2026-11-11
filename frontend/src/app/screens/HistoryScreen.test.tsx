import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { finishedAttempt, levelAttempt } from '../../storage/testing/attempts';
import { renderGame } from '../testing/render';

async function storageWith(...attempts: Parameters<ReturnType<typeof createMemoryStorage>['attempts']['save']>[0][]) {
  const storage = createMemoryStorage();

  for (const attempt of attempts) {
    await storage.attempts.save(attempt);
  }

  return storage;
}

function counts() {
  const stats = screen.getByRole('region', { name: 'Загальна статистика' });

  return {
    total: within(stats).getByText('Завершено тренувань').nextElementSibling?.textContent,
    items: within(stats)
      .getAllByRole('definition')
      .map((value) => value.textContent),
  };
}

describe('history', () => {
  // §24.5: the levels of the journey are workouts as well; the history names them.
  it('names a level of the journey of the game', async () => {
    const storage = await storageWith(
      levelAttempt('forest-ravens/1/2', 'loss', '2026-10-29T10:00:00.000Z', '2026-10-29T15:00:00.000Z'),
    );
    renderGame('/history', { storage });

    const [item] = await screen.findAllByRole('listitem');
    expect(within(item as HTMLElement).getByText('Похід')).toBeTruthy();
    expect(within(item as HTMLElement).getByText('Лісові круки · етап 1 · «Лісова варта» · 0 з 4 підходів')).toBeTruthy();
  });

  // §14.2: the total is always the sum of wins, draws and losses.
  it('lists every mode with the statistics of the whole history', async () => {
    const storage = await storageWith(
      finishedAttempt('win', '2026-10-29T10:00:00.000Z'),
      finishedAttempt('draw', '2026-10-29T11:00:00.000Z'),
      finishedAttempt('loss', '2026-10-29T12:00:00.000Z', 'ladder'),
    );
    renderGame('/history', { storage });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    expect(counts()).toEqual({ total: '3', items: ['1', '1', '1'] });
    const [newest] = screen.getAllByRole('listitem');
    expect(within(newest as HTMLElement).getByRole('link').textContent).toBe('ДрабинаПідтягування · до 1 · 0 з 1');
    expect(within(newest as HTMLElement).getByText('Поразка')).toBeTruthy();
  });

  // §21.3: the challenges passed count once each, and the list says which challenge an attempt took.
  it('counts the challenges passed', async () => {
    const squats = { slug: '100-squats', title: '100 присідань' };
    const storage = await storageWith(
      finishedAttempt('loss', '2026-10-29T10:00:00.000Z', 'target', squats),
      finishedAttempt('win', '2026-10-29T11:00:00.000Z', 'target', squats),
      finishedAttempt('win', '2026-10-29T12:00:00.000Z', 'target', squats),
    );
    renderGame('/history', { storage });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    const stats = screen.getByRole('region', { name: 'Загальна статистика' });
    expect(within(stats).getByText('Пройдено викликів').nextElementSibling?.textContent).toBe('1');
    expect(within(stats).getByRole('link', { name: 'Каталог викликів' }).getAttribute('href')).toBe('/challenges');
    expect(screen.getAllByText(/^Виклик/).map((label) => label.textContent)).toEqual([
      'Виклик пройдено · 100 присідань',
      'Виклик пройдено · 100 присідань',
      'Виклик · 100 присідань',
    ]);
  });

  // §14.3: filters by mode and by result.
  it('filters by mode and result together with the statistics', async () => {
    const storage = await storageWith(
      finishedAttempt('win', '2026-10-29T10:00:00.000Z'),
      finishedAttempt('loss', '2026-10-29T11:00:00.000Z'),
      finishedAttempt('win', '2026-10-29T12:00:00.000Z', 'ladder'),
    );
    const { user } = renderGame('/history', { storage });
    await screen.findAllByRole('listitem');

    await user.click(screen.getByRole('radio', { name: 'Драбина' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(counts().total).toBe('1');

    await user.click(within(screen.getByRole('group', { name: 'Режим' })).getByRole('radio', { name: 'Усі' }));
    await user.click(screen.getByRole('radio', { name: 'Поразки' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(counts()).toEqual({ total: '1', items: ['0', '0', '1'] });
  });

  it('invites to the first workout while the history is empty', async () => {
    renderGame('/history');

    expect(await screen.findByText('Ще немає завершених тренувань.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Почати тренування' }).getAttribute('href')).toBe('/');
  });

  it('loads the history page by page', async () => {
    const attempts = Array.from({ length: 22 }, (_, index) =>
      finishedAttempt('win', new Date(Date.UTC(2026, 9, 1, index)).toISOString()),
    );
    const { user } = renderGame('/history', { storage: await storageWith(...attempts) });

    expect(await screen.findAllByRole('listitem')).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Показати ще' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(22);
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull();
  });

  it('opens the result of an attempt', async () => {
    const attempt = finishedAttempt('win', '2026-10-29T10:00:00.000Z');
    const { user } = renderGame('/history', { storage: await storageWith(attempt) });

    await user.click(await screen.findByRole('link', { name: /^Ціль/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
  });

  it('explains a failure and tries again', async () => {
    const storage = createMemoryStorage();
    const list = storage.attempts.list.bind(storage.attempts);
    let failures = 1;
    storage.attempts.list = (query) => (failures-- > 0 ? Promise.reject(new Error('offline')) : list(query));
    const { user } = renderGame('/history', { storage });

    expect(await screen.findByText('Сервер зараз не відповідає. Спробуй ще раз за хвилину.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));

    expect(await screen.findByText('Ще немає завершених тренувань.')).toBeTruthy();
  });
});

// §23.2: the history is where a guest misses it on another device.
describe('the offer to sign in', () => {
  it('offers a guest to sign in until the offer is closed', async () => {
    const { user } = renderGame('/history');

    const offer = await screen.findByRole('region', { name: 'Історія на будь-якому пристрої' });
    expect(within(offer).getByRole('link', { name: 'Увійти через Google' }).getAttribute('href')).toBe(
      '/connect/google?to=%2Fworkout%2Fhistory',
    );

    await user.click(within(offer).getByRole('button', { name: 'Закрити пропозицію увійти' }));

    expect(screen.queryByRole('region', { name: 'Історія на будь-якому пристрої' })).toBeNull();
  });

  it('tells an account that the history opens on any device', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    renderGame('/history', { storage });

    expect(await screen.findByText(/^Історія відкривається на будь-якому пристрої/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Історія на будь-якому пристрої' })).toBeNull();
  });
});
