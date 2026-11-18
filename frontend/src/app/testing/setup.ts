import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without Vitest globals Testing Library cannot clean up by itself, so screens would pile up. The
// toasts stand beside the screens, in the body (app/toast.ts), so they go as well.
afterEach(() => {
  cleanup();
  for (const toasts of document.querySelectorAll('.toasts')) {
    toasts.remove();
  }
});

// What jsdom lacks for the screens: modal dialogs, scrolling and media queries.
if (typeof HTMLDialogElement !== 'undefined' && !('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      if (this.open) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      }
    },
  });
}

window.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
// No query matches: a test that needs one, say less motion, stubs it itself.
window.matchMedia = (media) => ({
  matches: false,
  media,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});
