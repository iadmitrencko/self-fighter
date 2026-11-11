import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '../../domain/engine/session';
import { finalize } from '../../domain/history/attempt';
import { play, randomOpponentConfig, testDeps } from '../../domain/testing/fixtures';
import { createApiStorage } from '../../storage/api';
import { createBrowserBuffer } from '../../storage/buffer';
import { createMemoryStorage } from '../../storage/memory';
import { finishedAttempt, levelAttempt } from '../../storage/testing/attempts';
import { createFakeServer } from '../../storage/testing/fakeServer';
import { renderKozak } from '../testing/render';

async function saved(attempt: Parameters<ReturnType<typeof createMemoryStorage>['attempts']['save']>[0]) {
  const storage = createMemoryStorage();
  await storage.attempts.save(attempt);

  return storage;
}

describe('result of an attempt', () => {
  // §24.5: a level of the journey has a result of its own, which tells its story. An old address of
  // the site leads here for a level as well.
  it('opens a level of the journey in its own result', async () => {
    const attempt = levelAttempt('forest-ravens/1/1', 'win', '2026-10-29T17:42:00.000Z', '2026-10-29T22:00:00.000Z');
    renderKozak(`/fight/result/${attempt.id}`, { storage: await saved(attempt) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Розбійника схоплено' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Повторити' })).toBeNull();
  });

  // §13.2: rounds, exercises and the counts of won, drawn and lost rounds.
  it('shows every round of a fight', async () => {
    const attempt = finishedAttempt('draw', '2026-10-29T17:42:00.000Z');
    renderKozak(`/fight/result/${attempt.id}`, { storage: await saved(attempt) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Нічия' })).toBeTruthy();
    expect(screen.getByText('0 : 0')).toBeTruthy();
    expect(screen.getByText('29 жовтня о 17:42')).toBeTruthy();
    const round = screen.getByRole('article');
    expect(within(round).getByRole('heading', { name: 'Раунд 1' })).toBeTruthy();
    expect(within(round).getAllByRole('row').map((row) => row.textContent)).toEqual([
      'РаундиТиЦільРезультат',
      'Віджимання1110▲перемога',
      'Присідання910▼поразка',
    ]);
  });

  // §13.3: the top, the highest step passed, the steps and the way back down.
  it('shows the steps of a ladder', async () => {
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z', 'ladder');
    renderKozak(`/fight/result/${attempt.id}`, { storage: await saved(attempt) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('Найвищий пройдений етап').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Повернення вниз').nextElementSibling?.textContent).toBe('ні');
    expect(screen.getByText('Етап 1: 1, пройдено')).toBeTruthy();
  });

  // §13.4: the same settings, new rolls of the opponent, the old attempt untouched.
  it('repeats an attempt with new results of the opponent', async () => {
    const attempt = finalize(play(createSession(randomOpponentConfig(), testDeps()), () => 30), new Date());
    const storage = await saved(attempt);
    const { user, analytics } = renderKozak(`/fight/result/${attempt.id}`, { storage });

    expect(await screen.findByText('«Повторити» — ті самі налаштування, нові результати суперника.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
    const session = storage.gameSessions.fight.load();
    expect(session?.config).toEqual(attempt.config);
    expect(session?.id).not.toBe(attempt.id);
    expect((await storage.attempts.get(attempt.id))?.attempt).toEqual(attempt);
    // §19 counts the repeats apart and the repeated workout among the starts.
    expect(analytics.events).toEqual([
      { name: 'workout_repeated', mode: 'random-opponent' },
      { name: 'workout_started', mode: 'random-opponent' },
    ]);
  });

  // §24.1: an old attempt that took a ready-made challenge shows it no more, and «Повторити» takes none.
  it('leaves the challenge of an old attempt behind', async () => {
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z', 'target', { slug: '100-squats', title: '100 присідань' });
    const storage = await saved(attempt);
    const { user } = renderKozak(`/fight/result/${attempt.id}`, { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(screen.queryByText(/100 присідань/)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
    expect(storage.gameSessions.fight.load()?.challenge).toBeNull();
  });

  // §15.4: an attempt that waits for the network says so.
  it('says when an attempt still waits for the server', async () => {
    const server = createFakeServer();
    const storage = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
    // The game knows who plays before the connection drops, so it opens without the network (§15.4).
    await storage.account.current();
    server.online = false;
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    await storage.attempts.save(attempt);
    renderKozak(`/fight/result/${attempt.id}`, { storage });

    expect(await screen.findByText("Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.")).toBeTruthy();
  });

  it('says when there is no such attempt', async () => {
    renderKozak('/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85');

    expect(await screen.findByRole('heading', { level: 1, name: 'Спробу не знайдено' })).toBeTruthy();
  });
});

// §23.2: after the first finished workout a guest is offered to sign in.
describe('the offer to sign in', () => {
  it('comes after the first workout only', async () => {
    const first = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    const storage = await saved(first);
    const view = renderKozak(`/fight/result/${first.id}`, { storage });

    expect(await screen.findByText(/^Перше тренування вже в історії/)).toBeTruthy();

    view.unmount();
    const second = finishedAttempt('loss', '2026-10-29T18:42:00.000Z');
    await storage.attempts.save(second);
    renderKozak(`/fight/result/${second.id}`, { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Поразка' })).toBeTruthy();
    expect(screen.queryByText(/^Перше тренування вже в історії/)).toBeNull();
  });

  it('is not made to an account', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    await storage.attempts.save(attempt);
    renderKozak(`/fight/result/${attempt.id}`, { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(screen.queryByText(/^Перше тренування вже в історії/)).toBeNull();
  });
});
