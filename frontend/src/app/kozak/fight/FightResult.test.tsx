import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../../domain/history/attempt';
import { fightConfig } from '../../../domain/testing/fixtures';
import { createApiStorage } from '../../../storage/api';
import { createBrowserBuffer } from '../../../storage/buffer';
import { createMemoryStorage } from '../../../storage/memory';
import { gameFight, levelAttempt } from '../../../storage/testing/attempts';
import { createFakeServer } from '../../../storage/testing/fakeServer';
import { renderKozak } from '../../testing/render';

async function saved(...attempts: Attempt[]) {
  const storage = createMemoryStorage();

  for (const attempt of attempts) {
    await storage.attempts.save(attempt);
  }

  return storage;
}

describe('the result of a fight', () => {
  // §6, §24.3: every set done wins the fight and brings glory.
  it('tells a won fight with its glory and every set', async () => {
    const fight = gameFight('win', '2026-10-30T09:50:00.000Z', '2026-10-30T11:50:00.000Z');
    renderKozak(`/fight/result/${fight.id}`, { storage: await saved(fight) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій виграно' })).toBeTruthy();
    expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual(['6 з 6', '82 з 82', '+1']);
    const grid = within(screen.getByRole('region', { name: 'Підходи бою' }));
    expect(grid.getAllByText(/виконано$/).map((label) => label.textContent)).toEqual([
      'Раунд 1, виконано',
      'Раунд 2, виконано',
      'Раунд 3, виконано',
      'Раунд 1, виконано',
      'Раунд 2, виконано',
      'Раунд 3, виконано',
    ]);
  });

  it('tells a lost fight and the set left undone', async () => {
    const fight = gameFight('loss', '2026-10-30T09:50:00.000Z', '2026-10-30T11:50:00.000Z');
    renderKozak(`/fight/result/${fight.id}`, { storage: await saved(fight) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій програно' })).toBeTruthy();
    expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual(['5 з 6', '62 з 82', '0']);
    expect(within(screen.getByRole('region', { name: 'Підходи бою' })).getByText('Раунд 3, не виконано')).toBeTruthy();
  });

  // §13.4: the same fight again, as a new attempt; the old one stays as it was.
  it('repeats the fight', async () => {
    const fight = gameFight('loss', '2026-10-30T09:50:00.000Z', '2026-10-30T11:50:00.000Z');
    const storage = await saved(fight);
    const { user, analytics } = renderKozak(`/fight/result/${fight.id}`, { storage });

    await user.click(await screen.findByRole('button', { name: /^Повторити/ }));

    expect(await screen.findByRole('dialog', { name: 'Бій' })).toBeTruthy();
    const session = storage.gameSessions.fight.load();
    expect(session?.config).toEqual(fightConfig());
    expect(session?.id).not.toBe(fight.id);
    expect((await storage.attempts.get(fight.id))?.attempt).toEqual(fight);
    // §19 counts the repeats apart and the repeated fight among the starts.
    expect(analytics.events).toEqual([
      { name: 'workout_repeated', mode: 'fight' },
      { name: 'workout_started', mode: 'fight' },
    ]);
  });

  // §24.5: a level of the journey has a result of its own, and an old address leads there as well.
  it('opens a level of the journey in its own result', async () => {
    const level = levelAttempt('forest-ravens/1/1', 'win', '2026-10-29T17:42:00.000Z', '2026-10-29T22:00:00.000Z');
    renderKozak(`/fight/result/${level.id}`, { storage: await saved(level) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Розбійника схоплено' })).toBeTruthy();
  });

  it('says when there is no such attempt', async () => {
    renderKozak('/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85');

    expect(await screen.findByRole('heading', { level: 1, name: 'Спробу не знайдено' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Новий бій' }).getAttribute('href')).toBe('/fight');
  });

  // §15.4: a fight that waits for the network says so.
  it('says when a fight still waits for the server', async () => {
    const server = createFakeServer();
    server.signIn({ sub: 'tester' });
    const storage = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
    // The game knows the account and its record before the connection drops, so it opens without the network.
    await storage.attempts.game('UTC');
    server.online = false;
    const fight = gameFight('win', '2026-10-30T09:50:00.000Z', '2026-10-30T11:50:00.000Z');
    await storage.attempts.save(fight);
    renderKozak(`/fight/result/${fight.id}`, { storage });

    expect(await screen.findByText("Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.")).toBeTruthy();
  });
});
