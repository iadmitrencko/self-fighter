import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from './toast';

// How long a new column of toasts settles before its first toast goes in.
const SETTLE = 100;

// The titles of the toasts on the screen, in the order they stand.
function titles(): (string | null)[] {
  return [...document.querySelectorAll('.toasts > .toast .toast__title')].map(({ textContent }) => textContent);
}

function crossOf(toast: HTMLElement): HTMLElement {
  return within(toast).getByRole('button', { name: 'Закрити' });
}

describe('a toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tells its title and its line in a status of a polite live region that comes first', () => {
    showToast('Вхід виконано', 'Тренування, вправи й налаштування синхронізуються між пристроями.');

    // A screen reader tells what is added to a region it already knows.
    const region = document.querySelector('.toasts');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(titles()).toEqual([]);

    vi.advanceTimersByTime(SETTLE);

    const toast = within(region as HTMLElement).getByRole('status');
    expect(toast.textContent).toBe('Вхід виконаноТренування, вправи й налаштування синхронізуються між пристроями.');
    expect(crossOf(toast).getAttribute('type')).toBe('button');
  });

  it('goes away by itself after five seconds or the time it is given, and the next one comes at once', () => {
    showToast('Перший', 'П’ять секунд');
    showToast('Другий', 'Дві секунди', { duration: 2000 });
    vi.advanceTimersByTime(SETTLE);

    // Several stand in a column, in the order they came.
    expect(titles()).toEqual(['Перший', 'Другий']);

    vi.advanceTimersByTime(2000);
    expect(titles()).toEqual(['Перший']);

    vi.advanceTimersByTime(2999);
    expect(titles()).toEqual(['Перший']);

    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);

    showToast('Третій', 'Колонка вже на місці');
    expect(titles()).toEqual(['Третій']);
  });

  it('waits while the pointer is over it or the focus is in it', () => {
    showToast('Вхід виконано', 'Тренування, вправи й налаштування синхронізуються між пристроями.');
    vi.advanceTimersByTime(SETTLE + 3000);
    const toast = screen.getByRole('status');

    fireEvent.pointerEnter(toast);
    vi.advanceTimersByTime(10_000);
    expect(toast.isConnected).toBe(true);
    fireEvent.pointerLeave(toast);

    // Two of the five seconds are left.
    vi.advanceTimersByTime(1999);
    expect(toast.isConnected).toBe(true);

    crossOf(toast).focus();
    vi.advanceTimersByTime(10_000);
    expect(toast.isConnected).toBe(true);
    crossOf(toast).blur();

    vi.advanceTimersByTime(1);
    expect(toast.isConnected).toBe(false);
  });

  it('closes at once with its cross and gives the focus back to where it came from', () => {
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    showToast('Вхід виконано', 'Тренування, вправи й налаштування синхронізуються між пристроями.');
    vi.advanceTimersByTime(SETTLE);
    const toast = screen.getByRole('status');

    crossOf(toast).focus();
    fireEvent.click(crossOf(toast));

    expect(toast.isConnected).toBe(false);
    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it('leaves the page once it has faded out', async () => {
    const close = showToast('Вхід виконано', 'Тренування, вправи й налаштування синхронізуються між пристроями.');
    vi.advanceTimersByTime(SETTLE);
    const toast = screen.getByRole('status');
    let fadedOut = () => undefined as void;
    const finished = new Promise<void>((resolve) => {
      fadedOut = resolve;
    });
    // jsdom does not animate, so the fading is played here.
    Object.assign(toast, { getAnimations: () => [{ finished }] });

    close();

    expect(toast.classList.contains('toast--leaving')).toBe(true);
    expect(toast.isConnected).toBe(true);

    fadedOut();

    await vi.waitFor(() => expect(toast.isConnected).toBe(false));
  });
});
