import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fightConfig } from '../../domain/testing/fixtures';
import { newId } from '../../storage/ids';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight, levelAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

// What a screen reader hears of the numbers of a card: a word, then its number.
function facts(region: HTMLElement): string[][] {
  return within(region)
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent ?? '']);
}

describe('the cossack', () => {
  // §24.2: a new player is a dzhura in an embroidered shirt, with no glory and full energy.
  it('starts as a dzhura', async () => {
    renderKozak('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Джура у вишиванці/ })).toBeTruthy();
    // «★ 0 / 10 слави», «наступне: Заставний» and the bar of the way there.
    expect(screen.getByText('0 з 10 слави')).toBeTruthy();
    expect(screen.getByText('Заставний').closest('p')?.textContent).toBe('наступне: Заставний');
    expect(screen.getByRole('progressbar', { name: 'Ще 10 слави до звання «Заставний»' }).getAttribute('aria-valuenow')).toBe('0');
    // §24.7: the record of battles in large numbers.
    const score = within(screen.getByRole('region', { name: 'Бойовий рахунок' }));
    expect(score.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual(['0 перемог', '0 нічиїх', '0 поразок']);
    // §24.4: both pools are full, so no countdown shows.
    const fight = within(screen.getByRole('region', { name: 'Бій' }));
    const journey = within(screen.getByRole('region', { name: 'Похід' }));
    expect(fight.getByText('Енергія боїв: 10 з 10')).toBeTruthy();
    expect(journey.getByText('Енергія походу: 6 з 6')).toBeTruthy();
    expect(screen.queryByText(/енергії через/)).toBeNull();
    expect(screen.queryByText(/Повна/)).toBeNull();
  });

  // resesign/kozak.html: the way to a battle starts on the screen of the cossack, in the card of its pool.
  it('leads to a fight and to the journey', async () => {
    const { user } = renderKozak('/');

    const fight = within(await screen.findByRole('region', { name: 'Бій' })).getByRole('link', { name: 'До бою' });
    expect(fight.getAttribute('href')).toBe('/fight');
    expect(within(screen.getByRole('region', { name: 'Похід' })).getByRole('link', { name: 'У похід' }).getAttribute('href')).toBe('/journey');
    // §24.1: the history is a section of the game, the screen of the cossack does not lead there again.
    expect(screen.queryByRole('link', { name: /Історія боїв/ })).toBeNull();

    await user.click(fight);
    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });

  // §24.4: a pool short of energy says when its next unit comes, and an empty one closes its way.
  it('counts down to the next unit and closes the way of an empty pool', async () => {
    const storage = createMemoryStorage();
    // The clock of the test stands at 10:00: ten units of fights are spent until 6:00 tomorrow.
    await storage.attempts.save(gameFight('loss', '2026-10-30T09:50:00.000Z', '2026-10-31T06:00:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T09:55:00.000Z', '2026-10-30T11:24:00.000Z'));
    renderKozak('/', { storage });

    const fight = within(await screen.findByRole('region', { name: 'Бій' }));
    expect(fight.getByText('Енергія боїв: 0 з 10')).toBeTruthy();
    expect(fight.getByText('+1 енергії через 2:00')).toBeTruthy();
    expect(fight.getByText('+1 енергії через 2 год')).toBeTruthy();
    expect(fight.getByRole('button', { name: 'До бою' })).toHaveProperty('disabled', true);
    expect(fight.queryByRole('link')).toBeNull();

    const journey = within(screen.getByRole('region', { name: 'Похід' }));
    expect(journey.getByText('Енергія походу: 5 з 6')).toBeTruthy();
    expect(journey.getByText('+1 енергії через 1:24')).toBeTruthy();
    expect(journey.getByRole('link', { name: 'У похід' })).toBeTruthy();
  });

  // §24.7: the fights of the game, those won and the run of wins since the last fight that was not.
  it('shows the fights of the game and the run of wins', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
    await storage.attempts.save(gameFight('loss', '2026-10-29T11:00:00.000Z', '2026-10-29T13:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-29T12:00:00.000Z', '2026-10-29T14:00:00.000Z'));
    await storage.attempts.save(gameFight('win', '2026-10-29T13:00:00.000Z', '2026-10-29T15:00:00.000Z'));
    // A level of the journey is no fight.
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-29T14:00:00.000Z', '2026-10-29T16:00:00.000Z'));
    renderKozak('/', { storage });

    expect(facts(await screen.findByRole('region', { name: 'Бій' }))).toEqual([
      ['Проведено боїв', '4'],
      ['Перемог', '3'],
      ['Серія перемог', '2'],
    ]);
  });

  // §24.8: the best set of every exercise of the journey, a set done in a lost level too.
  it('shows the best sets of the journey', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(levelAttempt('forest-ravens/2/3', 'win', '2026-10-29T10:00:00.000Z', '2026-10-29T15:00:00.000Z'));
    renderKozak('/', { storage });

    const journey = await screen.findByRole('region', { name: 'Похід' });
    expect(within(journey).getByRole('heading', { level: 3, name: 'Рекорди походу' })).toBeTruthy();
    expect(facts(journey)).toEqual([
      ['Відтискання', '—ще немає'],
      ['Присідання', '—ще немає'],
      ['Підтягування', '3 за підхід'],
    ]);
  });

  // §24.10: every exercise of the player, their own too, with every repetition of every mode.
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

    const physical = await screen.findByRole('region', { name: 'Фізична статистика' });
    const tiles = () =>
      within(physical)
        .getAllByRole('listitem')
        .map((tile) => [within(tile).getByRole('heading', { level: 3 }).textContent, ...facts(tile).map((fact) => fact.join(': '))]);

    await waitFor(() => expect(tiles()).toHaveLength(4));
    expect(tiles()).toEqual([
      ['Відтискання', 'Рекорд за підхід: 12', 'Усього повторень: 32'],
      ['Присідання', 'Рекорд за підхід: 20', 'Усього повторень: 50'],
      ['Підтягування', 'Рекорд за підхід: 3', 'Усього повторень: 6'],
      ['Скручування', 'Рекорд за підхід: 40', 'Усього повторень: 70'],
    ]);

    // An exercise made just now shows at once, with nothing done yet.
    const sections = within(screen.getByRole('navigation', { name: 'Розділи гри' }));
    await user.click(sections.getByRole('link', { name: 'Бій' }));
    await storage.exercises.save(plank);
    await user.click(sections.getByRole('link', { name: 'Козак' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Фізична статистика' }).textContent).toContain(plank.name));
    const fresh = within(screen.getByRole('region', { name: 'Фізична статистика' })).getByRole('heading', { level: 3, name: plank.name });
    expect(facts(fresh.closest('li') ?? fresh)).toEqual([
      ['Рекорд за підхід', '—ще немає'],
      ['Усього повторень', '0'],
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

  // §24.3, §24.6: glory comes from the wins of the game; its record counts fights and levels together.
  it('counts the glory and the record of the game', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(gameFight('win', '2026-10-30T08:10:00.000Z', '2026-10-30T10:10:00.000Z'));
    await storage.attempts.save(gameFight('loss', '2026-10-30T08:20:00.000Z', '2026-10-30T12:10:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T08:30:00.000Z', '2026-10-30T10:30:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'win', '2026-10-30T08:40:00.000Z', '2026-10-30T12:30:00.000Z'));
    renderKozak('/', { storage });

    await screen.findByRole('heading', { level: 1, name: 'Звання: Джура' });
    const score = within(screen.getByRole('region', { name: 'Бойовий рахунок' }));

    expect(score.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual(['2 перемоги', '0 нічиїх', '2 поразки']);
    expect(screen.getByText('3 з 10 слави')).toBeTruthy();
    const glory = screen.getByRole('progressbar', { name: 'Ще 7 слави до звання «Заставний»' });
    expect([glory.getAttribute('aria-valuenow'), glory.getAttribute('aria-valuemax')]).toEqual(['3', '10']);
    // The clock of the test stands at 10:00: the two fights and the two levels still owe a unit each,
    // the next of them back at 10:10 and 10:30.
    const fight = within(screen.getByRole('region', { name: 'Бій' }));
    const journey = within(screen.getByRole('region', { name: 'Похід' }));
    expect(fight.getByText('Енергія боїв: 8 з 10')).toBeTruthy();
    expect(fight.getByText('+1 енергії через 0:10')).toBeTruthy();
    expect(journey.getByText('Енергія походу: 4 з 6')).toBeTruthy();
    expect(journey.getByText('+1 енергії через 30 хв')).toBeTruthy();
    // The lost fight is the latest: no run of wins.
    expect(facts(screen.getByRole('region', { name: 'Бій' }))).toEqual([
      ['Проведено боїв', '2'],
      ['Перемог', '1'],
      ['Серія перемог', '0'],
    ]);
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
    expect(screen.getByRole('region', { name: 'Бойовий рахунок' }).textContent).toContain('45 перемог');
    expect(facts(screen.getByRole('region', { name: 'Бій' }))).toContainEqual(['Серія перемог', '45']);
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
