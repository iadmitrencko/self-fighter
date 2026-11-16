import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

// What a menu shows while it is open: the panel its button controls.
function panelOf(button: HTMLElement) {
  return within(document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement);
}

// §24.1: inside the game the header tells the state of the cossack instead of repeating its sections.
describe('the header of the game', () => {
  it('tells the rank and the energy of a new cossack and leads to them', async () => {
    renderKozak('/');

    const rank = await status().findByRole('link', { name: 'Звання «Джура», 0 з 10 слави' });
    expect(rank.getAttribute('href')).toBe('/ranks');
    const fight = status().getByRole('link', { name: 'Енергія боїв: 10 з 10' });
    expect(fight.getAttribute('href')).toBe('/fight');
    expect(description(fight)).toBe('+1 кожні 2 год');
    const journey = status().getByRole('link', { name: 'Енергія походу: 6 з 6' });
    expect(journey.getAttribute('href')).toBe('/journey');
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
  it('opens the menu of the player with the settings and the sign-in', async () => {
    const { user } = renderKozak('/');
    const menu = status().getByRole('button', { name: 'Меню гравця' });

    await user.click(menu);

    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(menu).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Налаштування', '/settings'],
      ['Увійти через Google', '/connect/google?to=%2Fgame'],
    ]);

    await user.keyboard('{Escape}');

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
  });

  // §23.2: an account signs out from any screen, and the settings say so.
  it('signs an account out from the menu', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена', email: 'olena@example.com' });
    const { user } = renderKozak('/fight', { storage });
    const menu = status().getByRole('button', { name: 'Меню гравця' });

    // The avatar is the first letter of the name.
    expect(await within(menu).findByText('О')).toBeTruthy();
    await user.click(menu);
    expect(panelOf(menu).getByText('Олена')).toBeTruthy();
    expect(panelOf(menu).getByText('olena@example.com')).toBeTruthy();
    await user.click(panelOf(menu).getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштування' })).toBeTruthy();
    expect(await screen.findByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
  });

  // On a phone the bar of the sections has room for four of them and «Ще» with the history and the menu of the player.
  it('keeps the history and the settings behind «Ще» in the bar of the sections', async () => {
    const { user } = renderKozak('/settings');
    const more = within(screen.getByRole('navigation', { name: 'Розділи гри' })).getByRole('button', { name: 'Ще' });

    await user.click(more);
    expect(panelOf(more).getAllByRole('link').map(({ textContent }) => textContent)).toEqual(['Історія', 'Налаштування', 'Увійти через Google']);
    expect(panelOf(more).getByRole('link', { name: 'Налаштування' }).getAttribute('aria-current')).toBe('page');
    await user.click(panelOf(more).getByRole('link', { name: 'Історія' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
    expect(more.getAttribute('aria-expanded')).toBe('false');
  });
});
