import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/history/attempt';
import { createMemoryStorage, type MemoryStorage } from '../../storage/memory';
import { finishedAttempt, gameFight, levelAttempt, oldGameFight } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

async function storageWith(...attempts: Attempt[]): Promise<MemoryStorage> {
  const storage = createMemoryStorage();

  for (const attempt of attempts) {
    await storage.attempts.save(attempt);
  }

  return storage;
}

function tally() {
  const stats = within(screen.getByRole('region', { name: 'Загальна статистика' }));

  return {
    total: stats.getByText(/^тренуван/).closest('p')?.textContent,
    counts: stats.getAllByRole('definition').map((value) => value.textContent),
  };
}

// The card of an attempt in the list, by the name it starts with.
function entry(name: RegExp): HTMLElement {
  return screen.getByRole('link', { name });
}

describe('the history of the game', () => {
  // §24.1: one history of the fights and the levels of the game and of the old modes of the site.
  it('names where every attempt comes from and opens its result', async () => {
    const workout = finishedAttempt('win', '2026-10-29T10:00:00.000Z');
    const fight = gameFight('loss', '2026-10-29T11:00:00.000Z', '2026-10-29T13:00:00.000Z');
    const oldFight = oldGameFight('draw', '2026-10-29T11:30:00.000Z', '2026-10-29T15:00:00.000Z');
    const level = levelAttempt('forest-ravens/1/2', 'loss', '2026-10-29T12:00:00.000Z', '2026-10-29T17:00:00.000Z');
    renderKozak('/history', { storage: await storageWith(workout, fight, oldFight, level) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
    expect(document.title).toBe('Історія — Self-Fighter');
    const items = await screen.findAllByRole('listitem');
    // Numbers keep to one line with what joins them.
    expect(items.map((item) => item.querySelector('.k-entry__details')?.textContent)).toEqual([
      'Похід · Лісові круки · етап\u00a01 · 0\u00a0з\u00a04 підходів',
      'Бій · 1 раунд · 2 вправи · 0\u00a0:\u00a00',
      'Бій · 3 раунди · 2 вправи · 5\u00a0з\u00a06 підходів',
      'Тренування · 1 раунд · 2 вправи · 1\u00a0:\u00a00',
    ]);
    expect(items.map((item) => item.querySelector('.k-entry__outcome')?.textContent)).toEqual(['Поразка', 'Нічия', 'Поразка', 'Перемога']);
    // A level opens its own result; a fight and an old attempt open as a fight (§24.1).
    expect(entry(/^Лісова варта/).getAttribute('href')).toBe(`/journey/result/${level.id}`);
    expect(entry(/^Віджимання, Присідання Поразка/).getAttribute('href')).toBe(`/fight/result/${fight.id}`);
    expect(entry(/^Ціль Нічия/).getAttribute('href')).toBe(`/fight/result/${oldFight.id}`);
    expect(entry(/^Ціль Перемога/).getAttribute('href')).toBe(`/fight/result/${workout.id}`);
  });

  it('opens the result of a fight of the game', async () => {
    const fight = gameFight('win', '2026-10-29T11:00:00.000Z', '2026-10-29T13:00:00.000Z');
    const { user } = renderKozak('/history', { storage: await storageWith(fight) });

    await user.click(await screen.findByRole('link', { name: /^Віджимання, Присідання/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій виграно' })).toBeTruthy();
  });

  // §24.6: an attempt of an old mode keeps its rounds and leads back to the history.
  it('opens an attempt of an old mode as it was', async () => {
    const { user } = renderKozak('/history', { storage: await storageWith(finishedAttempt('draw', '2026-10-29T11:00:00.000Z')) });

    await user.click(await screen.findByRole('link', { name: /^Ціль/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Нічия' })).toBeTruthy();
    expect(screen.getByRole('article')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'До історії' }).getAttribute('href')).toBe('/history');
    expect(screen.queryByRole('button', { name: /Повторити/ })).toBeNull();
  });

  // §14.2: the total is always the sum of wins, draws and losses.
  it('counts every attempt in the statistics', async () => {
    const storage = await storageWith(
      finishedAttempt('win', '2026-10-29T10:00:00.000Z'),
      finishedAttempt('draw', '2026-10-29T11:00:00.000Z'),
      finishedAttempt('loss', '2026-10-29T12:00:00.000Z', 'ladder'),
    );
    renderKozak('/history', { storage });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    expect(tally()).toEqual({ total: '3 тренування', counts: ['1', '1', '1'] });
    const newest = entry(/^Драбина/);
    expect(within(newest).getByText('Тренування · Підтягування · до 1 · 0 з 1')).toBeTruthy();
    expect(within(newest).getByText('Поразка')).toBeTruthy();
  });

  // §24.1: the site offers no ready-made challenges any more; an old attempt that took one counts
  // like any other and names it no more.
  it('counts an old attempt of a challenge like any other', async () => {
    const storage = await storageWith(finishedAttempt('win', '2026-10-29T11:00:00.000Z', 'target', { slug: '100-squats', title: '100 присідань' }));
    renderKozak('/history', { storage });

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(tally()).toEqual({ total: '1 тренування', counts: ['1', '0', '0'] });
    expect(screen.queryByText(/Виклик|100 присідань/)).toBeNull();
  });

  // §14.3: filters by fights and the journey, and by result.
  it('filters by mode and result together with the statistics', async () => {
    const storage = await storageWith(
      finishedAttempt('win', '2026-10-29T10:00:00.000Z'),
      gameFight('loss', '2026-10-29T11:00:00.000Z', '2026-10-29T13:00:00.000Z'),
      gameFight('win', '2026-10-29T12:00:00.000Z', '2026-10-29T15:00:00.000Z'),
      levelAttempt('forest-ravens/1/1', 'win', '2026-10-29T13:00:00.000Z', '2026-10-29T18:00:00.000Z'),
    );
    const { user } = renderKozak('/history', { storage });
    const modes = within(await screen.findByRole('group', { name: 'Режим' }));
    await screen.findAllByRole('listitem');

    expect(modes.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual(['Усі', 'Бій', 'Похід']);

    await user.click(modes.getByRole('radio', { name: 'Бій' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(tally().total).toBe('2 тренування');

    await user.click(modes.getByRole('radio', { name: 'Похід' }));

    expect(await screen.findByRole('link', { name: /^Перше випробування Перемога Похід/ })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    await user.click(modes.getByRole('radio', { name: 'Усі' }));
    await user.click(screen.getByRole('radio', { name: 'Поразки' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(tally()).toEqual({ total: '1 тренування', counts: ['0', '0', '1'] });
  });

  it('leads to the first battle while the history is empty', async () => {
    renderKozak('/history');

    expect(await screen.findByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeTruthy();
    expect(tally()).toEqual({ total: '0 тренувань', counts: ['0', '0', '0'] });
    expect(screen.getByRole('link', { name: 'До бою' }).getAttribute('href')).toBe('/fight');
    expect(screen.getByRole('link', { name: 'У похід' }).getAttribute('href')).toBe('/journey');
  });

  it('says so when a filter finds nothing', async () => {
    const { user } = renderKozak('/history', { storage: await storageWith(finishedAttempt('win', '2026-10-29T10:00:00.000Z')) });
    await screen.findAllByRole('listitem');

    await user.click(screen.getByRole('radio', { name: 'Нічиї' }));

    expect(await screen.findByText('За цим фільтром тренувань немає.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'До бою' })).toBeNull();
  });

  it('loads the history page by page', async () => {
    const attempts = Array.from({ length: 22 }, (_, index) =>
      finishedAttempt('win', new Date(Date.UTC(2026, 9, 1, index)).toISOString()),
    );
    const { user } = renderKozak('/history', { storage: await storageWith(...attempts) });

    expect(await screen.findAllByRole('listitem')).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Показати ще' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(22);
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull();
  });

  it('explains a failure and tries again', async () => {
    const storage = createMemoryStorage();
    const list = storage.attempts.list.bind(storage.attempts);
    let failures = 1;
    storage.attempts.list = (query) => (failures-- > 0 ? Promise.reject(new Error('offline')) : list(query));
    const { user } = renderKozak('/history', { storage });

    expect(await screen.findByText('Сервер зараз не відповідає. Спробуй ще раз за хвилину.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));

    expect(await screen.findByText('Історія ще порожня. Тут з’являться завершені бої й рівні походу.')).toBeTruthy();
  });
});

// §23.2: the history is where a guest misses it on another device.
describe('the offer to sign in in the history', () => {
  it('brings a guest back to the history of the game until the offer is closed', async () => {
    const { user } = renderKozak('/history');

    const offer = await screen.findByRole('region', { name: 'Історія на будь-якому пристрої' });
    expect(within(offer).getByRole('link', { name: 'Увійти через Google' }).getAttribute('href')).toBe(
      '/connect/google?to=%2Fgame%2Fhistory',
    );
    // The data of the player is a section of the game as well.
    const sections = screen.getByRole('navigation', { name: 'Розділи гри' });
    const toSettings = screen.getAllByRole('link', { name: 'Налаштування' }).filter((link) => !sections.contains(link));
    expect(toSettings.map((link) => link.getAttribute('href'))).toEqual(['/settings']);

    await user.click(within(offer).getByRole('button', { name: 'Закрити пропозицію увійти' }));

    expect(screen.queryByRole('region', { name: 'Історія на будь-якому пристрої' })).toBeNull();
  });

  it('tells an account that the history opens on any device', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    renderKozak('/history', { storage });

    expect(await screen.findByText(/^Історія відкривається на будь-якому пристрої/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Історія на будь-якому пристрої' })).toBeNull();
  });

  // §23.3: Google brings the browser back to the game, which offers to join what the browser saved.
  it('offers to join the data of the browser after coming back from Google', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    await storage.attempts.save(finishedAttempt('loss', '2026-10-28T10:00:00.000Z'));
    await storage.account.signOut();
    await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z'));
    storage.signIn({ sub: '1001' });
    const { user } = renderKozak('/history?sign-in=done', { storage });

    const dialog = await screen.findByRole('dialog', { name: 'Перенести дані цього браузера?' });
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);

    await user.click(within(dialog).getByRole('button', { name: 'Перенести' }));

    expect(await screen.findByText('Дані браузера перенесено в обліковий запис.')).toBeTruthy();
    // The history under the dialog shows the joined attempts at once.
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  });
});
