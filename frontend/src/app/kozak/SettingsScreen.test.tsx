import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageError } from '../../storage/errors';
import { createMemoryStorage } from '../../storage/memory';
import { gameFight } from '../../storage/testing/attempts';
import { renderKozak } from '../testing/render';

async function accountWithAttempt() {
  const storage = createMemoryStorage();
  await storage.attempts.save(gameFight('win', '2026-10-29T10:00:00.000Z', '2026-10-29T12:00:00.000Z'));

  return storage;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// §24.1: the data of the player is a section of the game.
describe('the settings of the game', () => {
  it('open with the name, the account and deleting the data', async () => {
    renderKozak('/settings');

    expect(await screen.findByRole('heading', { level: 1, name: 'Налаштування' })).toBeTruthy();
    expect(document.title).toBe('Налаштування — Self-Fighter');
    expect((await screen.findAllByRole('heading', { level: 2 })).map(({ textContent }) => textContent)).toEqual([
      'Ім’я козака',
      'Обліковий запис Google',
      'Видалити дані',
    ]);
    // §23.1: every player has signed in, so nothing offers it here.
    expect(screen.queryByRole('link', { name: 'Увійти через Google' })).toBeNull();
  });

  // §15.5: the data stays on the server; the settings only delete it.
  it('offer no download of the data', async () => {
    renderKozak('/settings', { storage: await accountWithAttempt() });

    expect(await screen.findByRole('button', { name: 'Видалити всі дані' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Завантажити/ })).toBeNull();
  });

  // §15.5: deleting is final, so it asks first; the account goes with its data, and the way in says so.
  it('delete the account with its data after a confirmation', async () => {
    const storage = await accountWithAttempt();
    const { user } = renderKozak('/settings', { storage });

    expect(await screen.findByText('Історія, власні вправи, налаштування й сам обліковий запис зникнуть назавжди.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Видалити всі дані' }));
    const dialog = screen.getByRole('dialog', { name: 'Видалити всі дані?' });
    expect(within(dialog).getByText('Обліковий запис, історію, власні вправи й налаштування не вдасться відновити.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Скасувати' }));

    expect(await storage.account.current()).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Видалити всі дані' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Видалити назавжди' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeTruthy();
    expect(screen.getByText('Обліковий запис і всі його дані видалено.')).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
  });
});

// §24.11: the player names the cossack, and an empty field takes the name away.
describe('the name of the cossack', () => {
  it('is given and taken away', async () => {
    const storage = createMemoryStorage();
    const { user } = renderKozak('/settings', { storage });

    const field = await screen.findByRole('textbox', { name: 'Ім’я або псевдонім' });
    expect(field.getAttribute('maxlength')).toBe('40');
    expect(screen.getByText('Його видно над званням козака.')).toBeTruthy();
    await user.type(field, ' Іван  Сірко ');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Ім’я козака збережено.')).toBeTruthy();
    expect(await storage.account.current()).toMatchObject({ nickname: 'Іван Сірко' });

    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Козак лишився без власного імені.')).toBeTruthy();
    expect(await storage.account.current()).toMatchObject({ nickname: null });
  });

  // Without a name of its own the cossack carries the name Google gave.
  it('says the cossack falls back to the name of Google', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена' });
    renderKozak('/settings', { storage });

    expect(await screen.findByText('Його видно над званням козака. Без нього козак носитиме ім’я з Google: Олена.')).toBeTruthy();
  });

  it('says when the server refuses the name', async () => {
    const storage = createMemoryStorage();
    vi.spyOn(storage.account, 'rename').mockRejectedValue(new StorageError('offline'));
    const { user } = renderKozak('/settings', { storage });

    await user.type(await screen.findByRole('textbox', { name: 'Ім’я або псевдонім' }), 'Іван');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText(/^Немає зв'язку із сервером/)).toBeTruthy();
  });
});

describe('signing out in the settings', () => {
  // §23.1–§23.2: the screen names the account, and signing out leads to the way in.
  it('shows whose account is open and signs out', async () => {
    const storage = createMemoryStorage();
    storage.signIn({ sub: '1001', name: 'Олена', email: 'olena@example.com' });
    const { user } = renderKozak('/settings', { storage });

    expect(await screen.findByText('Олена')).toBeTruthy();
    expect(screen.getByText('olena@example.com')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Увійди, щоб грати' })).toBeTruthy();
    expect(screen.getByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
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

    expect(await storage.account.current()).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Вийти' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Вийти' }));

    expect(await screen.findByText(/^Вихід виконано/)).toBeTruthy();
    expect(await storage.account.current()).toBeNull();
  });
});
