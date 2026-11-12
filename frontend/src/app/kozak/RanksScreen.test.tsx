import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

function rankRow(name: string): HTMLElement {
  const row = screen.getByText(name, { selector: '.k-rank__name' }).closest('li');

  if (row === null) {
    throw new Error(`No rank ${name}`);
  }

  return row;
}

describe('the ranks', () => {
  // §24.2, resesign/zvannya.html: all twenty ranks by the look they give.
  it('stand in groups by the look', async () => {
    renderKozak('/ranks');

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання' })).toBeTruthy();
    const ladder = within(screen.getByRole('region', { name: 'Усі звання' }));

    expect(ladder.getAllByRole('heading', { level: 2 }).map(({ textContent }) => textContent)).toEqual([
      'Молодші',
      'Козацтво',
      'Старшина',
      'Генералітет',
      'Вершина',
    ]);
    expect(ladder.getAllByRole('listitem')).toHaveLength(20);
    // The groups go by their names alone, without the numbers of their ranks.
    expect(ladder.queryByText(/^звання \d/)).toBeNull();
    expect(rankRow('Гетьман').textContent).toContain('20. Гетьман');
    expect(rankRow('Гетьман').textContent).toContain('від 3500');
  });

  it('mark the rank of a beginner and the one after it', async () => {
    renderKozak('/ranks');

    await screen.findByRole('heading', { level: 1, name: 'Звання' });
    const current = screen.getByRole('listitem', { current: 'step' });

    expect(current).toBe(rankRow('Джура'));
    expect(current.textContent).toContain('Зараз');
    expect(rankRow('Заставний').textContent).toContain('Ще 10 слави');
    expect(rankRow('Ройовий').textContent).toContain('від 25');

    const progress = within(screen.getByRole('region', { name: 'Твій поступ' }));
    expect(progress.getByText('з 10 до «Заставний»')).toBeTruthy();
    expect(progress.getByRole('progressbar', { name: '0 слави з 10 до звання «Заставний»' }).getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getByRole('link', { name: /До козака/ }).getAttribute('href')).toBe('/');

    const rewards = within(screen.getByRole('region', { name: 'Як здобути славу' }));
    expect(rewards.getAllByRole('term').map(({ textContent }) => textContent)).toEqual([
      'Перемога в бою',
      'Рівень походу',
      'Бос етапу',
      'Кампанію пройдено',
      'Похід пройдено',
    ]);
  });

  it('follow the glory of the cossack', async () => {
    const storage = createMemoryStorage();

    for (let fight = 0; fight < 12; fight += 1) {
      const minute = String(fight).padStart(2, '0');
      await storage.attempts.save(gameFight('win', `2026-10-29T10:${minute}:00.000Z`, `2026-10-29T12:${minute}:00.000Z`));
    }
    renderKozak('/ranks', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Звання' });

    expect(screen.getByRole('listitem', { current: 'step' })).toBe(rankRow('Заставний'));
    expect(rankRow('Джура').classList).toContain('k-rank--done');
    expect(rankRow('Ройовий').textContent).toContain('Ще 13 слави');
    expect(within(screen.getByRole('region', { name: 'Твій поступ' })).getByText('з 25 до «Ройовий»')).toBeTruthy();
  });
});
