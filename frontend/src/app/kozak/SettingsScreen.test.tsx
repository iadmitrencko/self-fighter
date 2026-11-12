import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageError } from '../../storage/errors';
import { createMemoryStorage, type MemoryStorage } from '../../storage/memory';
import { finishedAttempt } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

async function guestWithAttempt() {
  const storage = createMemoryStorage();
  await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z'));

  return storage;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// §24.1: the data of the player is a section of the game.
describe('the settings of the game', () => {
  it('has nothing to offer before the first save', async () => {
    renderKozak('/settings');

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштування' })).toBeTruthy();
    expect(document.title).toBe('Налаштування — Self-Fighter');
    expect(await screen.findByText('Ще нічого не збережено.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Видалити всі дані' })).toBeNull();
  });

  // §15.5: the data stays on the server; the settings only delete it.
  it('offers no download of the data', async () => {
    renderKozak('/settings', { storage: await guestWithAttempt() });

    expect(await screen.findByRole('button', { name: 'Видалити всі дані' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Завантажити/ })).toBeNull();
  });

  // §15.5: deleting is final, so it asks first.
  it('deletes the data after a confirmation', async () => {
    const storage = await guestWithAttempt();
    const { user } = renderKozak('/settings', { storage });

    await user.click(await screen.findByRole('button', { name: 'Видалити всі дані' }));
    const dialog = screen.getByRole('dialog', { name: 'Видалити всі дані?' });
    await user.click(within(dialog).getByRole('button', { name: 'Скасувати' }));

    expect(await storage.account.current()).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Видалити всі дані' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Видалити назавжди' }));

    expect(await screen.findByText('Дані видалено.')).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
    expect((await storage.attempts.stats()).total).toBe(0);
  });
});

// An account that also lives on another device, opened here beside a guest with one attempt.
async function accountWithKeptGuest(): Promise<MemoryStorage> {
  const storage = createMemoryStorage();
  storage.signIn({ sub: '1001' });
  await storage.attempts.save(finishedAttempt('loss', '2026-10-28T10:00:00.000Z'));
  await storage.account.signOut();
  await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z'));
  storage.signIn({ sub: '1001' });

  return storage;
}

describe('signing in and out in the settings', () => {
  // §23.2: the button of Google brings the browser back to this screen of the game.
  it('offers a guest to sign in with Google', async () => {
    renderKozak('/settings');

    const button = await screen.findByRole('link', { name: 'Увійти через Google' });
    expect(button.getAttribute('href')).toBe('/connect/google?to=%2Fgame%2Fsettings');
    expect(screen.queryByText(/Відкрий сайт у Safari чи Chrome/)).toBeNull();
  });

  // A server without a client of Google offers no sign-in that would fail.
  it('hides the button when the server offers no sign-in', async () => {
    renderKozak('/settings', { signIn: [] });

    expect(await screen.findByText('Ще нічого не збережено.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Увійти через Google' })).toBeNull();
  });

  // §23.2: inside the browser of another app Google may refuse, so the game says where to go.
  it('explains how to leave the browser of another app', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.114',
    );
    renderKozak('/settings');

    expect(await screen.findByText(/Відкрий сайт у Safari чи Chrome/)).toBeTruthy();
  });

  // §23.1–§23.2: the screen names the account, and signing out hides its data in this browser.
  it('shows whose account is open and signs out', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена', email: 'olena@example.com' });
    const { user } = renderKozak('/settings', { storage });

    expect(await screen.findByText('Олена')).toBeTruthy();
    expect(screen.getByText('olena@example.com')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Увійти через Google' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
    expect(await screen.findByRole('link', { name: 'Увійти через Google' })).toBeTruthy();
  });

  // §15.4: before signing out the game names the attempts that have not reached the server.
  it('warns about attempts that wait to be sent', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    const waiting = { ...storage, attempts: { ...storage.attempts, unsent: () => Promise.resolve(2) } };
    const { user } = renderKozak('/settings', { storage: waiting });

    await user.click(await screen.findByRole('button', { name: 'Вийти' }));
    const dialog = screen.getByRole('dialog', { name: 'Вийти з облікового запису?' });
    expect(within(dialog).getByText(/^2 тренування ще не надіслано/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Скасувати' }));

    expect(await storage.account.current()).toMatchObject({ kind: 'account' });

    await user.click(screen.getByRole('button', { name: 'Вийти' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
  });

  // §23.3: what the browser saved without signing in joins the account on request.
  it('takes the data of the browser into the account', async () => {
    const storage = await accountWithKeptGuest();
    const { user } = renderKozak('/settings', { storage });

    const card = await screen.findByRole('region', { name: 'Дані без входу' });
    expect(within(card).getByText(/^У цьому браузері є 1 тренування, збережені до входу/)).toBeTruthy();

    await user.click(within(card).getByRole('button', { name: 'Перенести в обліковий запис' }));

    expect(await screen.findByText('Дані браузера перенесено в обліковий запис.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Дані без входу' })).toBeNull();
    expect((await storage.attempts.stats()).total).toBe(2);
  });

  // §17.2: coming back from Google, a failure to join is explained, and the card still offers it.
  it('explains why the data was not joined after coming back from Google', async () => {
    const storage = await accountWithKeptGuest();
    const offline = {
      ...storage,
      account: { ...storage.account, joinGuest: () => Promise.reject(new StorageError('offline')) },
    };
    const { user } = renderKozak('/settings?sign-in=done', { storage: offline });

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Перенести' }));

    expect(await screen.findByText("Немає зв'язку із сервером. Перевір інтернет і спробуй ще раз.")).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Дані без входу' })).toBeTruthy();
  });

  // §15.5: deleting the data of an account deletes the account as well.
  it('says that the account goes with its data', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001' });
    const { user } = renderKozak('/settings', { storage });

    expect(await screen.findByText('Історія, власні вправи, налаштування й сам обліковий запис зникнуть назавжди.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Видалити всі дані' }));

    expect(
      within(screen.getByRole('dialog')).getByText('Обліковий запис, історію, власні вправи й налаштування не вдасться відновити.'),
    ).toBeTruthy();
  });
});
