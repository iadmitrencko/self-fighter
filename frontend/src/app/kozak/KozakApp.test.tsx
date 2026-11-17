import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage, type MemoryStorage } from '../../storage/memory';
import { gameFight } from '../../storage/testing/attempts';
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

// An account with an attempt from another device, opened here beside a guest with one attempt.
async function accountWithKeptGuest(): Promise<MemoryStorage> {
  const storage = createMemoryStorage();
  storage.signIn({ sub: '1001' });
  await storage.attempts.save(gameFight('loss', '2026-10-28T10:00:00.000Z', '2026-10-28T12:00:00.000Z'));
  await storage.account.signOut();
  await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));
  storage.signIn({ sub: '1001' });

  return storage;
}

// §23.2–§23.3: Google sends the browser back to the screen it left, with the outcome in the address.
describe('coming back from Google', () => {
  // §23.3: the data stays with the guest of the browser and comes back after signing out.
  it('leaves the data of the browser apart when the person says so', async () => {
    const storage = await accountWithKeptGuest();
    const { user } = renderKozak('/?sign-in=done', { storage });

    const dialog = await screen.findByRole('dialog', { name: 'Перенести дані цього браузера?' });
    await user.click(within(dialog).getByRole('button', { name: 'Не переносити' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await storage.account.keptGuest()).toMatchObject({ attempts: 1 });
  });

  // A sign-in that went well says so in a toast that goes away by itself, instead of a notice.
  it('tells a sign-in that went well in a toast', async () => {
    const { user } = renderKozak('/?sign-in=done');

    const toast = (await screen.findByText('Вхід виконано')).closest('.toast') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(within(toast).getByText('Тренування, вправи й налаштування синхронізуються між пристроями.')).toBeTruthy();
    expect(document.querySelector('.notice')).toBeNull();

    await user.click(within(toast).getByRole('button', { name: 'Закрити' }));

    expect(screen.queryByText('Вхід виконано')).toBeNull();
  });

  // A sign-in cancelled or failed waits until it is read: a notice above the screen.
  it.each([
    ['cancelled', 'Вхід скасовано. Без входу гра працює так само.'],
    ['failed', 'Не вдалося увійти через Google. Спробуй ще раз трохи згодом.'],
  ])('tells how the sign-in went: %s', async (outcome, text) => {
    const { user } = renderKozak(`/?sign-in=${outcome}`);

    const notice = (await screen.findByText(text)).closest('.notice');
    expect(notice?.getAttribute('role')).toBe(outcome === 'failed' ? 'alert' : 'status');

    await user.click(within(notice as HTMLElement).getByRole('button', { name: 'Закрити' }));

    expect(screen.queryByText(text)).toBeNull();
  });
});
