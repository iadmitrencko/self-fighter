import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_RECORD, type GameRecord } from '../../domain/kozak/record';
import { fightConfig } from '../../domain/testing/fixtures';
import { newId } from '../../storage/ids';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight, levelAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

// The record of battles as a screen reader hears it: a number, then its word.
function score(): (string | null)[] {
  return within(screen.getByRole('region', { name: 'Бойовий рахунок' }))
    .getAllByRole('listitem')
    .map(({ textContent }) => textContent);
}

// The rows of the physical statistics: the exercise, its best set and every repetition.
function physical(): (string | null)[][] {
  return within(screen.getByRole('table', { name: 'Фізична статистика' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [within(row).getByRole('rowheader'), ...within(row).getAllByRole('cell')].map(({ textContent }) => textContent));
}

// The glory as it reads: «★ 3 з 10 слави».
function gloryText(): string | null {
  return screen.getByText(/^з \d+ слави$/).textContent;
}

// The columns of the chart of the last seven days, as a screen reader hears them.
function week(): (string | null)[] {
  return within(screen.getByRole('region', { name: 'Останні 7 днів' }))
    .getAllByRole('listitem')
    .map((day) => day.getAttribute('aria-label'));
}

// The screen of the cossack without the header of the game around it.
function cossackScreen(): HTMLElement {
  return screen.getByRole('heading', { level: 1 }).closest('.k-screen') as HTMLElement;
}

// A storage that answers with this record of the game, whatever the attempts.
function storageWith(record: GameRecord) {
  const storage = createMemoryStorage();

  return { ...storage, attempts: { ...storage.attempts, game: () => Promise.resolve(record) } };
}

describe('the cossack', () => {
  // §24.2: a new player is a dzhura in an embroidered shirt, with no glory.
  it('starts as a dzhura', async () => {
    renderKozak('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Джура у вишиванці/ })).toBeTruthy();
    // «★ 0 з 10 слави», «наступне: Заставний» and the bar of the way there.
    expect(gloryText()).toBe('0 з 10 слави');
    expect(screen.getByRole('link', { name: 'наступне: Заставний' }).getAttribute('href')).toBe('/ranks');
    expect(screen.getByRole('progressbar', { name: 'Ще 10 слави до звання «Заставний»' }).getAttribute('aria-valuenow')).toBe('0');
    // §24.7: the record of battles in large numbers.
    expect(score()).toEqual(['0 перемог', '0 нічиїх', '0 поразок']);
    // §24.1: the header of the game shows the energy, the screen does not repeat it.
    expect(within(cossackScreen()).queryByText(/енергі/i)).toBeNull();
    // §24.12: no days in a row yet, and §24.10: nothing done in the last days.
    expect(screen.queryByText(/поспіль/)).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Останні 7 днів' })).getByText(/^За ці дні ще жодного повторення/)).toBeTruthy();
  });

  // §24.11: the name the player gave the cossack stands over the rank, the name of Google without it.
  it('shows the name of the cossack', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена' });
    const first = renderKozak('/', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Олена, Звання: Джура' })).toBeTruthy();
    first.unmount();

    await storage.account.rename('Іван Сірко');
    renderKozak('/', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Іван Сірко, Звання: Джура' })).toBeTruthy();
  });

  // §24.12: the days in a row with a battle; a run without a battle today yet asks to go on.
  it('counts the days in a row with a battle', async () => {
    const storage = createMemoryStorage();
    // The clock of the test stands at 10:00 on October 30.
    await storage.attempts.save(gameFight('win', '2026-10-27T10:00:00.000Z', '2026-10-27T12:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-28T10:00:00.000Z', '2026-10-28T12:00:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
    const first = renderKozak('/', { storage });

    expect((await screen.findByText(/поспіль/)).closest('p')?.textContent).toBe('3 дні поспіль, продовж сьогодні');
    first.unmount();

    await storage.attempts.save(gameFight('loss', '2026-10-30T09:30:00.000Z', '2026-10-30T11:30:00.000Z'));
    renderKozak('/', { storage });

    expect((await screen.findByText(/поспіль/)).closest('p')?.textContent).toBe('4 дні поспіль');
  });

  // §24.10: the repetitions of each of the last seven days, today the last; a day without them is zero.
  it('charts the last seven days', async () => {
    const storage = createMemoryStorage();
    // Too long ago for the chart.
    await storage.attempts.save(gameFight('win', '2026-10-20T10:00:00.000Z', '2026-10-20T12:00:00.000Z'));
    // Push-ups 10, 12 and 10, squats 15, 15 and 20.
    await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
    // Pull-ups 1, 2 and 3.
    await storage.attempts.save(levelAttempt('forest-ravens/2/3', 'win', '2026-10-30T09:00:00.000Z', '2026-10-30T11:00:00.000Z'));
    renderKozak('/', { storage });

    const chart = within(await screen.findByRole('region', { name: 'Останні 7 днів' }));
    expect(chart.getByText(/^88/).closest('p')?.textContent).toBe('88 повторень');
    const days = week();
    expect(days).toHaveLength(7);
    expect(days.slice(0, 5).every((day) => day?.endsWith(': 0 повторень'))).toBe(true);
    expect(days[5]).toMatch(/^четвер, 29 жовтня: 82 повторення$/);
    expect(days[6]).toMatch(/^п.ятниця, 30 жовтня: 6 повторень$/);
  });

  // §24.1: «Грати» of the site leads here, and the screen leads on to a fight and to the journey.
  it('leads to a fight and to the journey', async () => {
    const { user } = renderKozak('/');

    const fight = await screen.findByRole('link', { name: 'До бою' });
    expect(fight.getAttribute('href')).toBe('/fight');
    expect(screen.getByRole('link', { name: 'У похід' }).getAttribute('href')).toBe('/journey');
    // §24.1: the history is a section of the game, the screen of the cossack does not lead there again.
    expect(screen.queryByRole('link', { name: /Історія боїв/ })).toBeNull();

    await user.click(fight);
    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });

  // §24.4: with no energy the hall of fights closes the start itself and says when a unit comes back.
  it('keeps the way to a fight open without energy', async () => {
    const storage = createMemoryStorage();
    // The clock of the test stands at 10:00: ten units of fights are spent until 6:00 tomorrow.
    await storage.attempts.save(gameFight('loss', '2026-10-30T09:50:00.000Z', '2026-10-31T06:00:00.000Z'));
    const { user } = renderKozak('/', { storage });

    await user.click(await screen.findByRole('link', { name: 'До бою' }));
    expect(await screen.findByText('Енергії немає. Наступна одиниця через 2 год.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Енергія боїв вичерпалася' })).toHaveProperty('disabled', true);
  });

  // §24.2: the next rank leads to all the ranks and what brings glory.
  it('leads to the ranks', async () => {
    const { user } = renderKozak('/');

    await user.click(await screen.findByRole('link', { name: 'наступне: Заставний' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Звання' })).toBeTruthy();
    expect(screen.getByText('Похід пройдено').nextElementSibling?.textContent).toBe('+30');
  });

  // §24.7: every battle of the game, fights and levels alike.
  it('counts the record of battles', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
    await storage.attempts.save(gameFight('loss', '2026-10-29T11:00:00.000Z', '2026-10-29T13:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-29T12:00:00.000Z', '2026-10-29T14:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-29T13:00:00.000Z', '2026-10-29T15:00:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-29T14:00:00.000Z', '2026-10-29T16:00:00.000Z'));
    renderKozak('/', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' });
    expect(score()).toEqual(['3 перемоги', '0 нічиїх', '2 поразки']);
  });

  // §24.7: the battles of the game end in a win or a loss for now, yet the record keeps the draws.
  it('counts the draws', async () => {
    renderKozak('/', { storage: storageWith({ ...EMPTY_RECORD, fights: { wins: 1, draws: 2, losses: 0 } }) });

    await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' });
    expect(score()).toEqual(['1 перемога', '2 нічиї', '0 поразок']);
  });

  // §24.10: every exercise of the player, their own too, with every repetition of every battle.
  it('adds up every exercise of the player', async () => {
    const storage = createMemoryStorage();
    const crunches = { id: newId(), name: 'Скручування', description: '' };
    const plank = { id: newId(), name: 'Планка', description: '' };
    await storage.exercises.save(crunches);
    // Push-ups 10, 12 and 10, squats 15, 15 and 20.
    await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
    await storage.attempts.save(
      gameFight('win', '2026-10-29T11:00:00.000Z', '2026-10-29T14:00:00.000Z', fightConfig({ exercises: [{ ...crunches, sets: [30, 40] }] })),
    );
    // Pull-ups 1, 2 and 3 of a level.
    await storage.attempts.save(levelAttempt('forest-ravens/2/3', 'win', '2026-10-29T12:00:00.000Z', '2026-10-29T15:00:00.000Z'));
    const { user } = renderKozak('/', { storage });

    const table = await screen.findByRole('table', { name: 'Фізична статистика' });
    expect(within(table).getAllByRole('columnheader').map(({ textContent }) => textContent)).toEqual([
      'Вправа',
      'Рекорд за підхід',
      'За 7 днів',
      'Усього повторень',
    ]);
    await waitFor(() => expect(physical()).toHaveLength(4));
    // Every battle was within the last seven days.
    expect(physical()).toEqual([
      ['Відтискання', '12', '32', '32'],
      ['Присідання', '20', '50', '50'],
      ['Підтягування', '3', '6', '6'],
      ['Скручування', '40', '70', '70'],
    ]);

    // An exercise made just now shows at once, with nothing done yet.
    const sections = within(screen.getByRole('navigation', { name: 'Розділи гри' }));
    await user.click(sections.getByRole('link', { name: 'Бій' }));
    await storage.exercises.save(plank);
    await user.click(sections.getByRole('link', { name: 'Козак' }));
    await waitFor(() => expect(physical()).toHaveLength(5));
    expect(physical()[4]).toEqual(['Планка', '—ще немає', '0', '0']);
  });

  // §24.3, §24.6: glory comes from the wins of the game; its record counts fights and levels together.
  it('counts the glory and the record of the game', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(gameFight('win', '2026-10-30T08:10:00.000Z', '2026-10-30T10:10:00.000Z'));
    await storage.attempts.save(gameFight('loss', '2026-10-30T08:20:00.000Z', '2026-10-30T12:10:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T08:30:00.000Z', '2026-10-30T10:30:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'win', '2026-10-30T08:40:00.000Z', '2026-10-30T12:30:00.000Z'));
    renderKozak('/', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' });
    expect(score()).toEqual(['2 перемоги', '0 нічиїх', '2 поразки']);
    expect(gloryText()).toBe('3 з 10 слави');
    const glory = screen.getByRole('progressbar', { name: 'Ще 7 слави до звання «Заставний»' });
    expect([glory.getAttribute('aria-valuenow'), glory.getAttribute('aria-valuemax')]).toEqual(['3', '10']);
  });

  // §24.2: the glory of the highest rank leads nowhere further.
  it('stands at the top as a hetman', async () => {
    renderKozak('/', { storage: storageWith({ ...EMPTY_RECORD, fights: { wins: 3500, draws: 0, losses: 0 } }) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання: Гетьман' })).toBeTruthy();
    expect(screen.getByText('Найвище звання здобуто', { selector: 'p' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^наступне/ })).toBeNull();
    const glory = screen.getByRole('progressbar', { name: 'Найвище звання здобуто' });
    expect([glory.getAttribute('aria-valuenow'), glory.getAttribute('aria-valuemax')]).toEqual(['3500', '3500']);
  });

  // §24.2: the look follows the rank.
  it('dresses the cossack for his rank', async () => {
    const storage = createMemoryStorage();

    for (let fight = 0; fight < 45; fight += 1) {
      const minute = String(fight).padStart(2, '0');
      await storage.attempts.save(gameFight('win', `2026-10-29T10:${minute}:00.000Z`, `2026-10-29T12:${minute}:00.000Z`));
    }
    renderKozak('/', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання: Козак' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Козак у шкіряній безрукавці/ })).toBeTruthy();
    expect(score()).toEqual(['45 перемог', '0 нічиїх', '0 поразок']);
  });
});

describe('the sections of the game', () => {
  // The settings belong to the player, so the menu of the player leads there instead (GameHeader.test.tsx).
  it('lead to the cossack, the fights, the journey, the ranks and the history', async () => {
    const { user } = renderKozak('/');
    const sections = within(screen.getByRole('navigation', { name: 'Розділи гри' }));

    expect(sections.getAllByRole('link').map(({ textContent }) => textContent)).toEqual(['Козак', 'Бій', 'Похід', 'Звання', 'Історія']);
    expect(sections.getByRole('link', { name: 'Козак' }).getAttribute('aria-current')).toBe('page');

    await user.click(sections.getByRole('link', { name: 'Похід' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Похід «Січ»' })).toBeTruthy();
    expect(sections.getByRole('link', { name: 'Похід' }).getAttribute('aria-current')).toBe('page');

    await user.click(sections.getByRole('link', { name: 'Бій' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();

    await user.click(sections.getByRole('link', { name: 'Звання' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Звання' })).toBeTruthy();
    expect(sections.getByRole('link', { name: 'Звання' }).getAttribute('aria-current')).toBe('page');

    await user.click(sections.getByRole('link', { name: 'Історія' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
    expect(sections.getByRole('link', { name: 'Історія' }).getAttribute('aria-current')).toBe('page');
  });

  it('say so for an address the game does not know', async () => {
    renderKozak('/journey/forest-ravens/1/9');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});
