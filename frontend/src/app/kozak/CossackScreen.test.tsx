import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { finishedAttempt, gameFight, levelAttempt, oldGameFight } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

describe('the cossack', () => {
  // §24.2: a new player is a dzhura in a plain shirt, with no glory and full energy.
  it('starts as a dzhura', async () => {
    renderKozak('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /у простій сорочці/ })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Ще 10 слави до звання «Заставний»' })).toBeTruthy();
    expect(screen.getByText('10 слави').closest('p')?.textContent).toBe('Ще 10 слави до звання «Заставний»');
    // The meters show «10 / 10» and say «10 з 10».
    expect(screen.getByText('10 з 10')).toBeTruthy();
    expect(screen.getByText('6 з 6')).toBeTruthy();
    // Both pools get a unit back every 2 hours.
    expect(screen.getAllByText('Повна · +1 кожні 2 год')).toHaveLength(2);
  });

  // resesign/kozak.html: the way to a battle starts on the screen of the cossack.
  it('leads to a fight and to the journey', async () => {
    const { user } = renderKozak('/');

    const fight = await screen.findByRole('link', { name: /До бою/ });
    expect(fight.textContent).toContain('−1 енергії боїв');
    expect(fight.getAttribute('href')).toBe('/fight');
    expect(screen.getByRole('link', { name: /У похід/ }).getAttribute('href')).toBe('/journey');
    // §24.1: the history is a section of the game.
    expect(screen.getByRole('link', { name: /Історія боїв/ }).getAttribute('href')).toBe('/history');

    await user.click(fight);
    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });

  // §24.8: the best set of every exercise of the journey, a set done in a lost level too.
  it('shows the best sets of the journey', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(levelAttempt('forest-ravens/2/3', 'win', '2026-10-29T10:00:00.000Z', '2026-10-29T15:00:00.000Z'));
    renderKozak('/', { storage });

    const best = within(await screen.findByRole('region', { name: 'Рекорди походу' }));
    const rows = best.getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(rows).toEqual([
      ['Відтискання', '—ще немає'],
      ['Присідання', '—ще немає'],
      ['Підтягування', '3 за підхід'],
    ]);
  });

  // §24.3: «?» beside the glory tells what brings it.
  it('explains how to earn glory', async () => {
    const { user } = renderKozak('/');
    const help = await screen.findByRole('button', { name: 'Як здобути славу' });

    expect(help.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Як здобути славу' })).toBeNull();

    await user.click(help);
    const panel = within(screen.getByRole('region', { name: 'Як здобути славу' }));
    expect(help.getAttribute('aria-expanded')).toBe('true');
    expect(panel.getByText('Похід пройдено').nextElementSibling?.textContent).toBe('+30');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Як здобути славу' })).toBeNull();
    expect(document.activeElement).toBe(help);

    await user.click(help);
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('region', { name: 'Як здобути славу' })).toBeNull();
  });

  // §24.3, §24.6: glory comes from the wins of the game; its record counts fights and levels, not
  // the workouts of the site.
  it('counts the glory and the record of the game', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(finishedAttempt('win', '2026-10-30T08:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-30T08:10:00.000Z', '2026-10-30T10:10:00.000Z'));
    // A fight of «Ціль» the game played before §6 could end in a draw.
    await storage.attempts.save(oldGameFight('draw', '2026-10-30T08:20:00.000Z', '2026-10-30T12:10:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T08:30:00.000Z', '2026-10-30T10:30:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'win', '2026-10-30T08:40:00.000Z', '2026-10-30T12:30:00.000Z'));
    renderKozak('/', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' });
    const record = within(screen.getByRole('region', { name: 'Бойовий рахунок' }));

    expect(record.getByText('перемоги').textContent).toBe('2 перемоги');
    expect(record.getByText('нічия').textContent).toBe('1 нічия');
    expect(record.getByText('поразка').textContent).toBe('1 поразка');
    const glory = screen.getByRole('progressbar', { name: 'Ще 7 слави до звання «Заставний»' });
    expect([glory.getAttribute('aria-valuenow'), glory.getAttribute('aria-valuemax')]).toEqual(['3', '10']);
    // The clock of the test stands at 10:00: the two fights and the two levels still owe a unit each.
    expect(screen.getByText('4 з 6')).toBeTruthy();
    expect(screen.getByText('8 з 10')).toBeTruthy();
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
    expect(screen.getByRole('img', { name: /у жупані з червоним поясом/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Бойовий рахунок' }).textContent).toContain('45 перемог');
  });
});

describe('the sections of the game', () => {
  it('lead to the cossack, the fights, the journey, the ranks, the history and the settings', async () => {
    const { user } = renderKozak('/');
    const sections = within(screen.getByRole('navigation', { name: 'Розділи гри' }));

    expect(sections.getAllByRole('link').map(({ textContent }) => textContent)).toEqual([
      'Козак',
      'Бій',
      'Похід',
      'Звання',
      'Історія',
      'Налаштування',
    ]);
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

    await user.click(sections.getByRole('link', { name: 'Налаштування' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштування' })).toBeTruthy();
    expect(sections.getByRole('link', { name: 'Налаштування' }).getAttribute('aria-current')).toBe('page');
  });

  it('say so for an address the game does not know', async () => {
    renderKozak('/journey/forest-ravens/1/9');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});
