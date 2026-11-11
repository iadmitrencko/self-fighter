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
import { renderGame } from '../testing/render';

async function saved(attempt: Parameters<ReturnType<typeof createMemoryStorage>['attempts']['save']>[0]) {
  const storage = createMemoryStorage();
  await storage.attempts.save(attempt);

  return storage;
}

describe('result of an attempt', () => {
  // §24.5: the game tells the story of a level; the site shows how it went and leads there.
  it('leads to the game for a level of the journey', async () => {
    const attempt = levelAttempt('forest-ravens/1/1', 'win', '2026-10-29T17:42:00.000Z', '2026-10-29T22:00:00.000Z');
    renderGame(`/result/${attempt.id}`, { storage: await saved(attempt) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(screen.getByText('Лісові круки')).toBeTruthy();
    expect(screen.getByText('Перше випробування')).toBeTruthy();
    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Відкрити в грі' }).getAttribute('href')).toBe(`/game/journey/result/${attempt.id}`);
    expect(screen.queryByRole('button', { name: 'Повторити' })).toBeNull();
  });

  // §13.2: rounds, exercises and the counts of won, drawn and lost rounds.
  it('shows every round of a fight', async () => {
    const attempt = finishedAttempt('draw', '2026-10-29T17:42:00.000Z');
    renderGame(`/result/${attempt.id}`, { storage: await saved(attempt) });

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
    renderGame(`/result/${attempt.id}`, { storage: await saved(attempt) });

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
    const { user, analytics } = renderGame(`/result/${attempt.id}`, { storage });

    expect(await screen.findByText('«Повторити» — ті самі налаштування, нові результати суперника.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    const session = storage.activeSession.load();
    expect(session?.config).toEqual(attempt.config);
    expect(session?.id).not.toBe(attempt.id);
    expect(screen.getByRole('heading', { level: 1, name: 'Віджимання' })).toBeTruthy();
    expect((await storage.attempts.get(attempt.id))?.attempt).toEqual(attempt);
    // §19 counts the repeats apart and the repeated workout among the starts.
    expect(analytics.events).toEqual([
      { name: 'workout_repeated', mode: 'random-opponent' },
      { name: 'workout_started', mode: 'random-opponent' },
    ]);
  });

  // §21.3: a win with the settings of the page passes the challenge; «Повторити» tries it again.
  it('says that a challenge is passed', async () => {
    const challenge = { slug: '100-squats', title: '100 присідань' };
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z', 'target', challenge);
    const storage = await saved(attempt);
    const { user } = renderGame(`/result/${attempt.id}`, { storage });

    expect(await screen.findByText('Виклик «100 присідань» пройдено')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Сторінка виклику' }).getAttribute('href')).toBe('/challenges/100-squats');

    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(storage.activeSession.load()?.challenge).toEqual(challenge);
  });

  it('says that a challenge lost is not passed yet', async () => {
    const attempt = finishedAttempt('draw', '2026-10-29T17:42:00.000Z', 'target', { slug: '100-squats', title: '100 присідань' });
    renderGame(`/result/${attempt.id}`, { storage: await saved(attempt) });

    expect(await screen.findByText('Виклик «100 присідань» ще не пройдено: переможи, щоб його зарахувати.')).toBeTruthy();
  });

  // §15.4: an attempt that waits for the network says so.
  it('says when an attempt still waits for the server', async () => {
    const server = createFakeServer();
    server.online = false;
    const storage = createApiStorage({ fetch: server.fetch, buffer: createBrowserBuffer(null) });
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    await storage.attempts.save(attempt);
    renderGame(`/result/${attempt.id}`, { storage });

    expect(await screen.findByText("Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.")).toBeTruthy();
  });

  it('says when there is no such attempt', async () => {
    renderGame('/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85');

    expect(await screen.findByRole('heading', { level: 1, name: 'Спробу не знайдено' })).toBeTruthy();
  });
});

// §23.2: after the first finished workout a guest is offered to sign in.
describe('the offer to sign in', () => {
  it('comes after the first workout only', async () => {
    const first = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    const storage = await saved(first);
    const view = renderGame(`/result/${first.id}`, { storage });

    expect(await screen.findByText(/^Перше тренування вже в історії/)).toBeTruthy();

    view.unmount();
    const second = finishedAttempt('loss', '2026-10-29T18:42:00.000Z');
    await storage.attempts.save(second);
    renderGame(`/result/${second.id}`, { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Поразка' })).toBeTruthy();
    expect(screen.queryByText(/^Перше тренування вже в історії/)).toBeNull();
  });

  it('is not made to an account', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    const attempt = finishedAttempt('win', '2026-10-29T17:42:00.000Z');
    await storage.attempts.save(attempt);
    renderGame(`/result/${attempt.id}`, { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Перемога' })).toBeTruthy();
    expect(screen.queryByText(/^Перше тренування вже в історії/)).toBeNull();
  });
});
