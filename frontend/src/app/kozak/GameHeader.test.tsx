import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_RECORD } from '../../domain/kozak/record';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight, levelAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

function status() {
  return within(screen.getByRole('group', { name: 'Стан козака' }));
}

// The hint of a pill: the element that describes it.
function description(element: HTMLElement): string | null {
  return document.getElementById(element.getAttribute('aria-describedby') ?? '')?.textContent ?? null;
}

// How far the thin bar under the rank is filled. It is only seen: the hint says the same in words.
function barOf(rank: HTMLElement): string {
  return rank.querySelector<HTMLElement>('.game-rank__bar')?.style.getPropertyValue('--share') ?? '';
}

// What a menu shows while it is open: the panel its button controls.
function panelOf(button: HTMLElement) {
  return within(document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement);
}

// The gold dot that tells a guest the sign-in is still to be done. It is only seen, the menu says it.
function dotOf(button: HTMLElement): Element | null {
  return button.querySelector('.player-menu__dot');
}

// §24.1: inside the game the header tells the state of the cossack instead of repeating its sections.
describe('the header of the game', () => {
  it('tells the rank and the energy of a new cossack and leads to them', async () => {
    renderKozak('/');

    const rank = await status().findByRole('link', { name: 'Звання «Джура», 0 слави' });
    expect(rank.getAttribute('href')).toBe('/ranks');
    expect(description(rank)).toBe('Ще 10 слави до звання «Заставний»');
    const fight = status().getByRole('link', { name: 'Енергія боїв: 10 з 10' });
    expect(fight.getAttribute('href')).toBe('/fight');
    expect(description(fight)).toBe('+1 кожні 2 години');
    const journey = status().getByRole('link', { name: 'Енергія походу: 6 з 6' });
    expect(journey.getAttribute('href')).toBe('/journey');
  });

  // §24.2: the thin bar of the rank is the way from the rank the cossack holds to the next one, as on
  // the screens of the cossack and of the ranks.
  it('measures the way to the next rank from the rank held', async () => {
    const storage = createMemoryStorage();
    const withGlory = (wins: number) => ({
      ...storage,
      attempts: { ...storage.attempts, game: () => Promise.resolve({ ...EMPTY_RECORD, fights: { wins, draws: 0, losses: 0 } }) },
    });
    const first = renderKozak('/', { storage: withGlory(12) });

    const rank = await status().findByRole('link', { name: 'Звання «Заставний», 12 слави' });
    expect(description(rank)).toBe('Ще 13 слави до звання «Ройовий»');
    // 2 of the 15 glory from «Заставний» at 10 to «Ройовий» at 25.
    expect(Number.parseFloat(barOf(rank))).toBeCloseTo(13.33, 2);
    first.unmount();

    renderKozak('/', { storage: withGlory(3500) });
    const hetman = await status().findByRole('link', { name: 'Звання «Гетьман», 3500 слави' });
    expect(description(hetman)).toBe('Найвище звання здобуто');
    expect(barOf(hetman)).toBe('100%');
  });

  // §24.4: the hint of a pool short of energy says when its next unit comes back.
  it('says when the next unit of energy comes back', async () => {
    const storage = createMemoryStorage();
    // The clock of the test stands at 10:00: ten units of fights are spent until 6:00 tomorrow.
    await storage.attempts.save(gameFight('loss', '2026-10-30T09:50:00.000Z', '2026-10-31T06:00:00.000Z'));
    await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', '2026-10-30T09:55:00.000Z', '2026-10-30T11:24:00.000Z'));
    renderKozak('/', { storage });

    expect(description(await status().findByRole('link', { name: 'Енергія боїв: 0 з 10' }))).toBe('+1 через 2 год');
    expect(description(status().getByRole('link', { name: 'Енергія походу: 5 з 6' }))).toBe('+1 через 1 год 24 хв');
  });

  // The history stands among the sections of the game, so the menu of the header does not repeat it.
  // Signing in keeps what a guest has won, so it comes first and says so, and the avatar shows a dot.
  it('opens the menu of a guest with the sign-in first, then the settings', async () => {
    const { user } = renderKozak('/');
    const menu = status().getByRole('button', { name: 'Меню гравця' });

    await waitFor(() => expect(dotOf(menu)).not.toBeNull());
    await user.click(menu);

    expect(menu.getAttribute('aria-expanded')).toBe('true');
    const signIn = panelOf(menu).getByRole('link', { name: 'Увійти через Google', description: 'Щоб не втратити славу й прогрес' });
    expect(signIn.getAttribute('href')).toBe('/connect/google?to=%2Fgame');
    expect(panelOf(menu).getAllByRole('link')).toEqual([signIn, panelOf(menu).getByRole('link', { name: 'Налаштування' })]);

    await user.keyboard('{Escape}');

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  });

  // Without a client of Google there is nothing to sign in with, so nothing asks for it.
  it('neither offers nor marks the sign-in without Google', async () => {
    const { user } = renderKozak('/', { signIn: [] });
    const menu = status().getByRole('button', { name: 'Меню гравця' });

    await user.click(menu);

    expect(panelOf(menu).getAllByRole('link').map(({ textContent }) => textContent)).toEqual(['Налаштування']);
    expect(dotOf(menu)).toBeNull();
  });

  // §23.2: an account signs out from any screen, and the settings say so.
  it('signs an account out from the menu', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена', email: 'olena@example.com' });
    const { user } = renderKozak('/fight', { storage });
    const menu = status().getByRole('button', { name: 'Меню гравця' });

    // The avatar is the first letter of the name, without the dot of a guest.
    expect(await within(menu).findByText('О')).toBeTruthy();
    expect(dotOf(menu)).toBeNull();
    await user.click(menu);
    expect(panelOf(menu).getByText('Олена')).toBeTruthy();
    expect(panelOf(menu).getByText('olena@example.com')).toBeTruthy();
    expect(panelOf(menu).queryByRole('link', { name: 'Увійти через Google' })).toBeNull();
    await user.click(panelOf(menu).getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштування' })).toBeTruthy();
    expect(await screen.findByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
  });

  // On a phone the bar of the sections has room for four of them and «Ще» with the history and the menu of the player.
  it('keeps the history and the settings behind «Ще» in the bar of the sections', async () => {
    const { user } = renderKozak('/settings');
    const more = within(screen.getByRole('navigation', { name: 'Розділи гри' })).getByRole('button', { name: 'Ще' });

    // «Ще» carries the dot of a guest as the avatar does.
    await waitFor(() => expect(dotOf(more)).not.toBeNull());
    await user.click(more);
    expect(panelOf(more).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/connect/google?to=%2Fgame%2Fsettings',
      '/history',
      '/settings',
    ]);
    expect(panelOf(more).getByRole('link', { name: 'Налаштування' }).getAttribute('aria-current')).toBe('page');
    await user.click(panelOf(more).getByRole('link', { name: 'Історія' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
    expect(more.getAttribute('aria-expanded')).toBe('false');
  });
});
