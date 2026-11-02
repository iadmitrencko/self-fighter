import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from '../../storage/memory';
import { finishedAttempt } from '../../storage/testing/attempts';
import { renderGame } from '../testing/render';

async function guestWithAttempt() {
  const storage = createMemoryStorage();
  await storage.attempts.save(finishedAttempt('win', '2026-10-29T10:00:00.000Z'));

  return storage;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('data of the player', () => {
  it('has nothing to offer before the first save', async () => {
    renderGame('/account');

    expect(await screen.findByText('Ще нічого не збережено.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Завантажити дані' })).toBeNull();
  });

  // §15.5: a guest downloads all data as a file.
  it('downloads every piece of data as JSON', async () => {
    const files: Blob[] = [];
    URL.createObjectURL = vi.fn((file: Blob) => {
      files.push(file);

      return 'blob:data';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { user } = renderGame('/account', { storage: await guestWithAttempt() });

    await user.click(await screen.findByRole('button', { name: 'Завантажити дані' }));

    expect(click).toHaveBeenCalledOnce();
    const data = JSON.parse(await (files[0] as Blob).text()) as { attempts: unknown[] };
    expect(data.attempts).toHaveLength(1);
  });

  // §15.5: deleting is final, so it asks first.
  it('deletes the data after a confirmation', async () => {
    const storage = await guestWithAttempt();
    const { user } = renderGame('/account', { storage });

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
