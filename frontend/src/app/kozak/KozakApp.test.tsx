import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { renderKozak } from '../testing/render';

describe('the game', () => {
  // The hall shows the fight after the cossack has loaded: its heading takes the focus then.
  it('puts the focus on the heading of a new screen', async () => {
    renderKozak('/fight');
    await screen.findByRole('button', { name: /^До бою/ });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Бій' }));
    });
  });

  it('returns to the hall when no fight is in progress', async () => {
    renderKozak('/fight/battle');

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });
});

describe('the links of the site', () => {
  // The footer of the site opens screens of the game without loading the page again.
  it('open a screen of the game from the footer', async () => {
    const { user } = renderKozak('/');
    await screen.findByRole('heading', { level: 1, name: /^Звання/ });
    const footer = document.createElement('a');
    footer.href = '/game/history';
    footer.textContent = 'Історія';
    document.body.append(footer);

    await user.click(footer);

    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
    footer.remove();
  });

  it('leave the pages of the site and new tabs to the browser', async () => {
    const { user } = renderKozak('/');
    await screen.findByRole('heading', { level: 1, name: /^Звання/ });
    const landing = document.createElement('a');
    landing.href = '/#game';
    landing.textContent = 'Гра';
    const tab = document.createElement('a');
    tab.href = '/game/fight';
    tab.target = '_blank';
    tab.textContent = 'Бій у новій вкладці';
    // An address outside the game, such as one the site no longer has.
    const removed = document.createElement('a');
    removed.href = '/workout/setup/ladder';
    removed.textContent = 'Старе тренування';
    const clicks: boolean[] = [];
    const remember = (event: MouseEvent) => {
      clicks.push(event.defaultPrevented);
      event.preventDefault();
    };
    document.body.append(landing, tab, removed);
    window.addEventListener('click', remember);

    await user.click(landing);
    await user.click(tab);
    await user.click(removed);

    window.removeEventListener('click', remember);
    landing.remove();
    tab.remove();
    removed.remove();
    expect(clicks).toEqual([false, false, false]);
    expect(screen.getByRole('heading', { level: 1, name: /^Звання/ })).toBeTruthy();
  });
});

// §23.1: the game needs an account, so every screen of it shows the way in until the person signs in.
describe('without an account', () => {
  it.each(['/', '/fight', '/journey', '/ranks', '/history', '/settings'])('asks to sign in on %s', async (path) => {
    renderKozak(path, { storage: createMemoryStorage({ signedIn: false }) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeTruthy();
    // Google brings the browser back to the screen it asked for.
    expect(screen.getByRole('link', { name: 'Увійти через Google' }).getAttribute('href')).toBe(
      `/connect/google?to=${encodeURIComponent(path === '/' ? '/game' : `/game${path}`)}`,
    );
    expect(screen.getByRole('link', { name: 'Які дані ми зберігаємо' }).getAttribute('href')).toBe('/privacy');
    // The sections of the game and the state of the cossack wait for the account.
    expect(screen.queryByRole('navigation', { name: 'Розділи гри' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Стан козака' })).toBeNull();
  });

  it('says so when the server has no way to sign in', async () => {
    renderKozak('/', { storage: createMemoryStorage({ signedIn: false }), signIn: [] });

    expect(await screen.findByText('Вхід зараз недоступний, тож грати не вийде. Спробуй трохи згодом.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Увійти через Google' })).toBeNull();
  });

  // The person comes back from Google, and the game opens on the screen they asked for.
  it('opens the game once the person has signed in', async () => {
    const storage = createMemoryStorage({ signedIn: false });
    const first = renderKozak('/ranks', { storage });
    await screen.findByRole('heading', { level: 1, name: 'Увійди, щоб грати' });
    first.unmount();

    storage.signIn({ sub: '1001', name: 'Олена' });
    renderKozak('/ranks?sign-in=done', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Звання' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Розділи гри' })).toBeTruthy();
  });
});

// §23.2: Google sends the browser back to the screen it left, with the outcome in the address.
describe('coming back from Google', () => {
  // A sign-in that went well says so in a toast that goes away by itself, instead of a notice.
  it('tells a sign-in that went well in a toast', async () => {
    const { user } = renderKozak('/?sign-in=done');

    const toast = (await screen.findByText('Вхід виконано')).closest('.toast') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(within(toast).getByText('Козак і його бої тепер відкриваються на будь-якому пристрої.')).toBeTruthy();
    expect(document.querySelector('.notice')).toBeNull();

    await user.click(within(toast).getByRole('button', { name: 'Закрити' }));

    expect(screen.queryByText('Вхід виконано')).toBeNull();
  });

  // A sign-in cancelled or failed waits until it is read: a notice above the way in.
  it.each([
    ['cancelled', 'Вхід скасовано. Щоб грати, увійди через Google.'],
    ['failed', 'Не вдалося увійти через Google. Спробуй ще раз трохи згодом.'],
  ])('tells how the sign-in went: %s', async (outcome, text) => {
    const { user } = renderKozak(`/?sign-in=${outcome}`, { storage: createMemoryStorage({ signedIn: false }) });

    const notice = (await screen.findByText(text)).closest('.notice');
    expect(notice?.getAttribute('role')).toBe(outcome === 'failed' ? 'alert' : 'status');
    expect(screen.getByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeTruthy();

    await user.click(within(notice as HTMLElement).getByRole('button', { name: 'Закрити' }));

    expect(screen.queryByText(text)).toBeNull();
  });
});
