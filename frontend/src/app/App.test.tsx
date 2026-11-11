import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '../domain/engine/session';
import { targetConfig, testDeps } from '../domain/testing/fixtures';
import { createMemoryStorage, type MemoryStorage } from '../storage/memory';
import { finishedAttempt } from '../storage/testing/attempts';
import { renderGame } from './testing/render';

describe('the game', () => {
  it('opens on the choice of a mode', () => {
    renderGame('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeTruthy();
    expect(document.title).toBe('Обери режим — Self-Fighter');
  });

  it('says so for a screen it does not have', () => {
    renderGame('/setup/boxing');

    expect(screen.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeTruthy();
  });

  it('returns to the choice of a mode when no attempt is in progress', () => {
    renderGame('/fight');

    expect(screen.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeTruthy();
  });

  // §12.4: a reload during a workout continues it.
  it('continues the attempt in progress', () => {
    const storage = createMemoryStorage();
    storage.activeSession.save(createSession(targetConfig(), testDeps()));

    renderGame('/fight', { storage });

    expect(screen.getByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
  });

  it('puts the focus on the heading of a new screen', () => {
    renderGame('/setup/ladder');

    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Налаштуй драбину' }));
  });

  // §24.1: the history and the data of the player live in the game, so the site has no screens for them.
  it.each(['/history', '/account'])('has no screen at %s', (path) => {
    renderGame(path);

    expect(screen.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeTruthy();
  });
});

describe('navigation', () => {
  // Every screen leads back by itself, so nobody needs the button of the browser.
  it.each([
    ['/', 'На головну', '/'],
    ['/setup/ladder', 'До вибору режиму', '/'],
    // The history is a section of the game: it opens as a page.
    ['/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85', 'До історії', '/game/history'],
    ['/unknown', 'До вибору режиму', '/'],
  ])('leads back from %s with «%s»', async (path, text, target) => {
    renderGame(path);

    expect((await screen.findByRole('link', { name: text })).getAttribute('href')).toBe(target);
  });

  // The header of the site opens screens of the game without loading the page again.
  it('opens a screen of the game from a link of the site header', async () => {
    const { user } = renderGame('/');
    const header = document.createElement('a');
    header.href = '/workout/setup/ladder';
    header.textContent = 'Драбина в шапці';
    document.body.append(header);

    await user.click(header);

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштуй драбину' })).toBeTruthy();
    header.remove();
  });

  // The score in the frame of the site follows the history on every screen.
  it('shows the score of the player in the frame of the site', async () => {
    const storage = createMemoryStorage();
    await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z', 'target', { slug: '100-squats', title: '100 присідань' }));
    await storage.attempts.save(finishedAttempt('loss', '2026-10-29T11:00:00.000Z'));
    const frame = document.createElement('dl');
    frame.innerHTML = ['total', 'wins', 'draws', 'losses', 'challenges'].map((key) => `<dd data-score="${key}">–</dd>`).join('');
    document.body.append(frame);

    renderGame('/', { storage });

    await waitFor(() => {
      expect([...frame.querySelectorAll('dd')].map((value) => value.textContent)).toEqual(['2', '1', '0', '1', '1']);
    });
    frame.remove();
  });

  it('leaves links of the site and new tabs to the browser', async () => {
    const { user } = renderGame('/');
    const landing = document.createElement('a');
    landing.href = '/#modes';
    landing.textContent = 'Режими';
    const tab = document.createElement('a');
    tab.href = '/workout/setup/ladder';
    tab.target = '_blank';
    tab.textContent = 'Драбина в новій вкладці';
    // The history lives under the router of the game.
    const inGame = document.createElement('a');
    inGame.href = '/game/history';
    inGame.textContent = 'Історія';
    const clicks: boolean[] = [];
    const remember = (event: MouseEvent) => {
      clicks.push(event.defaultPrevented);
      event.preventDefault();
    };
    document.body.append(landing, tab, inGame);
    window.addEventListener('click', remember);

    await user.click(landing);
    await user.click(tab);
    await user.click(inGame);

    window.removeEventListener('click', remember);
    landing.remove();
    tab.remove();
    inGame.remove();
    expect(clicks).toEqual([false, false, false]);
    expect(screen.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeTruthy();
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
  it('offers to join what the browser saved without signing in', async () => {
    const storage = await accountWithKeptGuest();
    const { user } = renderGame('/?sign-in=done', { storage });

    const dialog = await screen.findByRole('dialog', { name: 'Перенести дані цього браузера?' });
    expect(within(dialog).getByText(/^У цьому браузері є 1 тренування, збережені без входу/)).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Перенести' }));

    expect(await screen.findByText('Дані браузера перенесено в обліковий запис.')).toBeTruthy();
    expect(await storage.account.keptGuest()).toBeNull();
    // The score in the frame of the site counts the joined attempts at once.
    expect((await storage.attempts.stats()).total).toBe(2);
  });

  // §23.3: the data stays with the guest of the browser and comes back after signing out.
  it('leaves the data of the browser apart when the person says so', async () => {
    const storage = await accountWithKeptGuest();
    const { user } = renderGame('/?sign-in=done', { storage });

    await user.click(await screen.findByRole('button', { name: 'Не переносити' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await storage.account.keptGuest()).toMatchObject({ attempts: 1 });
  });

  it.each([
    ['done', 'Вхід виконано: тренування, вправи й налаштування тепер доступні на будь-якому пристрої.'],
    ['cancelled', 'Вхід скасовано. Без входу гра працює так само.'],
    ['failed', 'Не вдалося увійти через Google. Спробуй ще раз трохи згодом.'],
  ])('tells how the sign-in went: %s', async (outcome, text) => {
    const { user } = renderGame(`/?sign-in=${outcome}`);

    const notice = (await screen.findByText(text)).closest('.notice');
    expect(notice?.getAttribute('role')).toBe(outcome === 'failed' ? 'alert' : 'status');

    await user.click(within(notice as HTMLElement).getByRole('button', { name: 'Закрити' }));

    expect(screen.queryByText(text)).toBeNull();
  });
});
