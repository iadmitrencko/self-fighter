import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without Vitest globals Testing Library cannot clean up by itself, so screens would pile up.
afterEach(() => {
  cleanup();
});

// What jsdom lacks for the screens: modal dialogs and scrolling.
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
