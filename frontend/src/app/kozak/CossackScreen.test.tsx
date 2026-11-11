import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { finishedAttempt, gameFight, levelAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

describe('the cossack', () => {
  // §24.2: a new player is a dzhura in a plain shirt, with no glory and full energy.
  it('starts as a dzhura', async () => {
    renderKozak('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Джура' })).toBeTruthy();
    expect(screen.getByText('Звання 1 з 20')).toBeTruthy();
    expect(screen.getByRole('img', { name: /у простій сорочці/ })).toBeTruthy();
    expect(screen.getAllByText('Ще 10 слави до звання «Заставний»').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10 з 10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5 з 5').length).toBeGreaterThan(0);
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Джура');
  });

  // §24.3, §24.6: glory comes from the wins of the game; its record counts fights and levels, not
  // the workouts of the site.
  it('counts the glory and the record of the game', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(finishedAttempt('win', '2026-10-30T08:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-30T08:10:00.000Z', '2026-10-30T10:10:00.000Z'));
    await storage.attempts.save(gameFight('draw', '2026-10-30T08:20:00.000Z', '2026-10-30T12:10:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T08:30:00.000Z', '2026-10-30T13:30:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'win', '2026-10-30T08:40:00.000Z', '2026-10-30T18:30:00.000Z'));
    renderKozak('/', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Джура' });
    const record = within(screen.getByRole('region', { name: 'Бойовий рахунок' }));

    expect(record.getByText('Перемоги').nextElementSibling?.textContent).toBe('2');
    expect(record.getByText('Нічиї').nextElementSibling?.textContent).toBe('1');
    expect(record.getByText('Поразки').nextElementSibling?.textContent).toBe('1');
    expect(screen.getAllByText('Ще 7 слави до звання «Заставний»').length).toBeGreaterThan(0);
    // The clock of the test stands at 10:00: the two fights and the two levels still owe a unit each.
    const energy = within(screen.getByRole('region', { name: 'Енергія' }));
    expect(energy.getByText('3 з 5')).toBeTruthy();
    expect(energy.getByText('8 з 10')).toBeTruthy();
  });

  // §24.2: the look follows the rank.
  it('dresses the cossack for his rank', async () => {
    const storage = createMemoryStorage();

    for (let fight = 0; fight < 45; fight += 1) {
      const minute = String(fight).padStart(2, '0');
      await storage.attempts.save(gameFight('win', `2026-10-29T10:${minute}:00.000Z`, `2026-10-29T12:${minute}:00.000Z`));
    }
    renderKozak('/', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Козак' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /у жупані з червоним поясом/ })).toBeTruthy();
  });
});

describe('the sections of the game', () => {
  it('lead to the cossack, the fights and the journey', async () => {
    const { user } = renderKozak('/');
    const sections = within(screen.getByRole('navigation', { name: 'Розділи гри' }));

    expect(sections.getByRole('link', { name: 'Козак' }).getAttribute('aria-current')).toBe('page');

    await user.click(sections.getByRole('link', { name: 'Похід' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Похід «Січ»' })).toBeTruthy();
    expect(sections.getByRole('link', { name: 'Похід' }).getAttribute('aria-current')).toBe('page');

    await user.click(sections.getByRole('link', { name: 'Бій' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });

  it('show the rank, the glory and the energy beside every screen', async () => {
    renderKozak('/journey');
    const status = within(await screen.findByRole('region', { name: 'Козак' }));

    expect(status.getByText('Джура')).toBeTruthy();
    expect(status.getByText('Енергія боїв')).toBeTruthy();
    expect(status.getByText('Енергія походу')).toBeTruthy();
  });

  it('say so for an address the game does not know', async () => {
    renderKozak('/journey/forest-ravens/1/9');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});
