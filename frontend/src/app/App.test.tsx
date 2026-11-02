import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '../domain/engine/session';
import { targetConfig, testDeps } from '../domain/testing/fixtures';
import { createMemoryStorage } from '../storage/memory';
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
