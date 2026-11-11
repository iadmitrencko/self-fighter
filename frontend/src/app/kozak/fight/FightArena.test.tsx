import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, submitResult } from '../../../domain/engine/session';
import { targetConfig, testDeps } from '../../../domain/testing/fixtures';
import { createMemoryStorage } from '../../../storage/memory';
import { gameFight } from '../../../storage/testing/attempts';
import { renderKozak } from '../../testing/render';

// Ten fights the hour before the clock of the tests (10:00): the first unit comes back at 11:00.
async function spentFights() {
  const storage = createMemoryStorage();

  for (let fight = 0; fight < 10; fight += 1) {
    const minute = String(fight).padStart(2, '0');
    const fullAt = new Date(Date.parse('2026-10-30T11:00:00.000Z') + fight * 2 * 3_600_000).toISOString();
    await storage.attempts.save(gameFight('loss', `2026-10-30T09:${minute}:00.000Z`, fullAt));
  }

  return storage;
}

describe('the fights of the game', () => {
  // §24.6: the modes of the site, in the colors of the game, with the energy of fights.
  it('start from the choice of a mode', async () => {
    const { user } = renderKozak('/fight');

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій' })).toBeTruthy();
    expect(screen.getAllByText('10 з 10').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: /Драбина/ }));
    await user.click(screen.getByRole('link', { name: 'До налаштування бою' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштуй драбину' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'До вибору бою' }).getAttribute('href')).toBe('/fight');
  });

  // §24.4, §24.3: a start takes a unit of energy; a win adds glory.
  it('spends energy on the start and gives glory for a win', async () => {
    const { user, storage } = renderKozak('/fight/setup/ladder');

    await user.click(await screen.findByRole('radio', { name: 'Підтягування' }));
    await user.clear(screen.getByRole('textbox', { name: /Максимум драбини/ }));
    await user.type(screen.getByRole('textbox', { name: /Максимум драбини/ }), '1');
    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    const session = storage.gameSessions.fight.load();
    expect(session?.game?.pool).toBe('fight');
    expect(storage.activeSession.load()).toBeNull();

    await user.type(await screen.findByRole('textbox', { name: 'Твій результат' }), '2');
    await user.click(screen.getByRole('button', { name: 'Зафіксувати етап' }));

    expect(await screen.findByText('+1 слава')).toBeTruthy();
    expect(storage.gameSessions.fight.load()).toBeNull();
    expect((await storage.attempts.game()).fights).toEqual({ wins: 1, draws: 0, losses: 0 });
    // §24.1: the history is a section of the game, beside the result as in the menu.
    const sections = screen.getByRole('navigation', { name: 'Розділи гри' });
    const toHistory = screen.getAllByRole('link', { name: 'Історія' }).filter((link) => !sections.contains(link));
    expect(toHistory.map((link) => link.getAttribute('href'))).toEqual(['/history']);
  });

  // §24.6: leaving a fight in the middle loses it, so its energy stays spent.
  it('counts a fight left in the middle as lost', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.fight.save({
      ...submitResult(createSession(targetConfig(), testDeps()), 0, 99),
      game: { pool: 'fight', energyFullAt: '2026-10-30T12:00:00.000Z' },
    });
    const { user } = renderKozak('/fight/battle', { storage });

    await user.click(await screen.findByRole('button', { name: 'Відступити' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Відступити з бою?' }));
    await user.click(dialog.getByRole('button', { name: 'Відступити' }));

    expect(await screen.findByRole('heading', { level: 1, name: /Поразка/ })).toBeTruthy();
    expect(screen.getByText(/Слава приходить лише з перемогою/)).toBeTruthy();
    expect((await storage.attempts.game()).fights.losses).toBe(1);
  });

  it('offers the fight in progress back', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.fight.save(createSession(targetConfig(), testDeps()));
    renderKozak('/fight', { storage });

    expect(await screen.findByRole('heading', { name: 'Незавершений бій' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Продовжити бій' }).getAttribute('href')).toBe('/fight/battle');
  });

  // §24.4: without energy the hall waits, and the setup refuses the start.
  it('waits for the energy to come back', async () => {
    const storage = await spentFights();
    const { unmount } = renderKozak('/fight', { storage });

    expect(await screen.findByRole('button', { name: 'Енергія боїв вичерпалася' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Енергії немає. Наступна одиниця через 1 год.')).toBeTruthy();
    unmount();

    const { user } = renderKozak('/fight/setup/ladder', { storage });
    await user.click(await screen.findByRole('radio', { name: 'Підтягування' }));
    await user.type(screen.getByRole('textbox', { name: /Максимум драбини/ }), '3');
    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    expect(screen.getByRole('alert').textContent).toBe('Енергії для бою немає. Відпочинь: вона відновиться сама.');
    expect(storage.gameSessions.fight.load()).toBeNull();
  });

  it('starts no second fight while one is in progress', async () => {
    const storage = createMemoryStorage();
    const first = createSession(targetConfig(), testDeps());
    storage.gameSessions.fight.save(first);
    const { user } = renderKozak('/fight/setup/ladder', { storage });

    await user.click(await screen.findByRole('radio', { name: 'Підтягування' }));
    await user.type(screen.getByRole('textbox', { name: /Максимум драбини/ }), '3');
    await user.click(screen.getByRole('button', { name: 'Почати драбину' }));

    expect(screen.getByRole('alert').textContent).toContain('незавершений бій');
    expect(storage.gameSessions.fight.load()).toEqual(first);
  });
});
