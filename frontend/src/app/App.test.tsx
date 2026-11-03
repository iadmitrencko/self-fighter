import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '../domain/engine/session';
import { targetConfig, testDeps } from '../domain/testing/fixtures';
import { createMemoryStorage } from '../storage/memory';
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
    renderGame('/history');

    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Історія' }));
  });
});

describe('navigation', () => {
  // Every screen leads back by itself, so nobody needs the button of the browser.
  it.each([
    ['/', 'На головну', '/'],
    ['/setup/ladder', 'До вибору режиму', '/'],
    ['/history', 'До вибору режиму', '/'],
    ['/account', 'До вибору режиму', '/'],
    ['/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85', 'До історії', '/history'],
    ['/unknown', 'До вибору режиму', '/'],
  ])('leads back from %s with «%s»', async (path, text, target) => {
    renderGame(path);

    expect((await screen.findByRole('link', { name: text })).getAttribute('href')).toBe(target);
  });

  // The header of the site opens screens of the game without loading the page again.
  it('opens a screen of the game from a link of the site header', async () => {
    const { user } = renderGame('/');
    const header = document.createElement('a');
    header.href = '/workout/history';
    header.textContent = 'Історія в шапці';
    document.body.append(header);

    await user.click(header);

    expect(await screen.findByRole('heading', { level: 1, name: 'Історія' })).toBeTruthy();
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
    tab.href = '/workout/history';
    tab.target = '_blank';
    tab.textContent = 'Історія в новій вкладці';
    const clicks: boolean[] = [];
    const remember = (event: MouseEvent) => {
      clicks.push(event.defaultPrevented);
      event.preventDefault();
    };
    document.body.append(landing, tab);
    window.addEventListener('click', remember);

    await user.click(landing);
    await user.click(tab);

    window.removeEventListener('click', remember);
    landing.remove();
    tab.remove();
    expect(clicks).toEqual([false, false]);
    expect(screen.getByRole('heading', { level: 1, name: 'Обери режим' })).toBeTruthy();
  });
});
