import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage, type MemoryStorage } from '../../storage/memory';
import { finishedAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

describe('the game', () => {
  // The setup shows its form after the cossack has loaded: the heading of the form takes the focus then.
  it('puts the focus on the heading of a new screen', async () => {
    renderKozak('/fight/setup/ladder');
    await screen.findByRole('button', { name: 'Почати драбину' });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Налаштуй драбину' }));
    });
  });

  it('returns to the choice of a fight when none is in progress', async () => {
    renderKozak('/fight/battle');

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
  });
});

describe('the links of the site', () => {
  // The header of the site opens screens of the game without loading the page again.
  it('open a screen of the game from the header', async () => {
    const { user } = renderKozak('/');
    await screen.findByRole('heading', { level: 1, name: /^Звання/ });
    const header = document.createElement('a');
    header.href = '/game/fight/setup/ladder';
    header.textContent = 'Драбина в шапці';
    document.body.append(header);

    await user.click(header);

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштуй драбину' })).toBeTruthy();
    header.remove();
  });

  it('leave the pages of the site and new tabs to the browser', async () => {
    const { user } = renderKozak('/');
    await screen.findByRole('heading', { level: 1, name: /^Звання/ });
    const landing = document.createElement('a');
    landing.href = '/#modes';
    landing.textContent = 'Режими';
    const tab = document.createElement('a');
    tab.href = '/game/fight/setup/ladder';
    tab.target = '_blank';
    tab.textContent = 'Драбина в новій вкладці';
    // §24.1: an old address of the site, which the server leads into the game.
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
  await storage.attempts.save(finishedAttempt('loss', '2026-10-28T10:00:00.000Z'));
  await storage.account.signOut();
  await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z'));
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

  it.each([
    ['done', 'Вхід виконано: тренування, вправи й налаштування тепер доступні на будь-якому пристрої.'],
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
