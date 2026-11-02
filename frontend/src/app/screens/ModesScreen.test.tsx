import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, submitResult } from '../../domain/engine/session';
import { targetConfig, testDeps } from '../../domain/testing/fixtures';
import { createMemoryStorage } from '../../storage/memory';
import { renderGame } from '../testing/render';

describe('choice of a mode', () => {
  it('offers the four modes, «Ціль» first', () => {
    renderGame('/');

    expect(screen.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual([
      '01Ціль',
      '02Випадковий суперник',
      '03Рівні суперників',
      '04Драбина',
    ]);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: /Ціль/ }).checked).toBe(true);
  });

  // §16.4: the task, the way to win and the length are known before the start.
  it('explains the chosen mode and leads to its setup', async () => {
    const { user } = renderGame('/');

    await user.click(screen.getByRole('radio', { name: /Драбина/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Драбина' })).toBeTruthy();
    expect(screen.getByText('Пройдено всі етапи. Один непройдений етап — поразка. Нічиєї немає.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Далі — налаштування' }).getAttribute('href')).toBe('/setup/ladder');
  });

  // §12.4: an interrupted attempt can be continued or dropped.
  it('offers back an attempt in progress', async () => {
    const storage = createMemoryStorage();
    const session = createSession(targetConfig(), testDeps());
    storage.activeSession.save(submitResult(session, 0, 11));
    const { user } = renderGame('/', { storage });

    expect(screen.getByText('Ціль · пройдено етапів: 1 з 4')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Продовжити' }).getAttribute('href')).toBe('/fight');

    await user.click(screen.getByRole('button', { name: 'Відкинути' }));

    expect(screen.queryByText('Незавершене тренування')).toBeNull();
    expect(storage.activeSession.load()).toBeNull();
  });
});
