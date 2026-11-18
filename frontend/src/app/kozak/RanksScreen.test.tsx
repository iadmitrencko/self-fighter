import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

// The way to the next rank, as on the screen of the cossack: the glory, how much more the next rank
// needs and the bar of that way, from where it starts through the glory to where it ends.
function progress() {
  const card = within(screen.getByRole('region', { name: 'Твій поступ' }));
  const bar = card.getByRole('progressbar', { name: /^Поступ до звання/ });

  return {
    card,
    glory: card.getByText(/слав/, { selector: '.k-glory__value' }).textContent,
    left: card.getByText(/^Ще/, { selector: '.k-glory__next' }).textContent,
    bar: [bar.getAttribute('aria-label'), ...['aria-valuemin', 'aria-valuenow', 'aria-valuemax'].map((name) => bar.getAttribute(name))],
  };
}

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

    const { card, glory, left, bar } = progress();
    expect(glory).toBe('0 слави');
    expect(left).toBe('Ще 10 слави до звання\u00a0«Заставний»');
    expect(bar).toEqual(['Поступ до звання «Заставний»', '0', '0', '10']);
    // The page of the ranks does not lead to itself, only back to the cossack.
    expect(card.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/']);

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
    // The bar of the way starts at the rank the cossack holds.
    const { glory, left, bar } = progress();
    expect(glory).toBe('12 слави');
    expect(left).toBe('Ще 13 слави до звання\u00a0«Ройовий»');
    expect(bar).toEqual(['Поступ до звання «Ройовий»', '10', '12', '25']);
  });
});
