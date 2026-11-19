import { toastTexts } from '../i18n/uk';

/*
 * Toasts: a short message that floats over the screen without moving it and goes away by itself, as
 * a sign-in that went well does. Several stand in a column. A toast waits while the pointer is over
 * it or the focus is in it, and its cross closes it at once. Their styles are in app.css.
 */

// How long a toast stays on the screen while nothing holds it, in milliseconds.
export const TOAST_DURATION = 5000;

// A screen reader tells what is added to a live region it already knows, so a region made for the
// first toast has a moment to settle before the toast goes in.
const SETTLE = 100;

export interface ToastOptions {
  // Milliseconds on the screen, not counting the time the toast is held.
  readonly duration?: number;
}

let region: HTMLElement | null = null;
let settling: (() => void)[] | null = null;

/**
 * Shows a toast: a title and a line under it, after the toasts already on the screen. Returns what
 * closes it at once.
 */
export function showToast(title: string, text: string, { duration = TOAST_DURATION }: ToastOptions = {}): () => void {
  const cross = element('button', 'toast__close', icon(ICON_PATHS.close));
  cross.type = 'button';
  cross.setAttribute('aria-label', toastTexts.close);
  const toast = element(
    'div',
    'toast',
    element('span', 'toast__icon', icon(ICON_PATHS.check)),
    element('div', 'toast__body', element('p', 'toast__title', title), element('p', 'toast__text', text)),
    cross,
  );
  toast.setAttribute('role', 'status');

  let remaining = duration;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pointed = false;
  let focused = false;
  let leaving = false;
  // Where the focus came from, so a toast closed from the keyboard gives it back.
  let cameFrom: HTMLElement | null = null;

  // The time runs while nothing holds the toast.
  const sync = () => {
    if (leaving) {
      return;
    }
    const held = pointed || focused;

    if (held && timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      remaining -= performance.now() - startedAt;
    } else if (!held && timer === undefined) {
      startedAt = performance.now();
      timer = setTimeout(close, Math.max(0, remaining));
    }
  };

  function close() {
    if (leaving) {
      return;
    }
    leaving = true;
    clearTimeout(timer);
    if (toast.contains(document.activeElement)) {
      cameFrom?.focus();
    }
    toast.classList.add('toast--leaving');
    // It leaves the page once it has faded out, and at once when it does not move (reduced motion).
    const animations = toast.isConnected && typeof toast.getAnimations === 'function' ? toast.getAnimations() : [];

    if (animations.length === 0) {
      toast.remove();
    } else {
      void Promise.allSettled(animations.map(({ finished }) => finished)).then(() => toast.remove());
    }
  }

  toast.addEventListener('pointerenter', () => {
    pointed = true;
    sync();
  });
  toast.addEventListener('pointerleave', () => {
    pointed = false;
    sync();
  });
  toast.addEventListener('focusin', ({ relatedTarget }) => {
    if (!focused && relatedTarget instanceof HTMLElement && !toast.contains(relatedTarget)) {
      cameFrom = relatedTarget;
    }
    focused = true;
    sync();
  });
  toast.addEventListener('focusout', ({ relatedTarget }) => {
    focused = relatedTarget instanceof Node && toast.contains(relatedTarget);
    sync();
  });
  cross.addEventListener('click', close);

  place((into) => {
    if (!leaving) {
      into.append(toast);
      sync();
    }
  });

  return close;
}

// The column of the toasts, a polite live region. It is made for the first toast and stays, empty,
// between them, so the next one goes in at once.
function place(show: (into: HTMLElement) => void): void {
  if (region === null || !region.isConnected) {
    const made = element('div', 'toasts');
    const waiting: (() => void)[] = [];

    made.setAttribute('aria-live', 'polite');
    document.body.append(made);
    region = made;
    settling = waiting;
    setTimeout(() => {
      if (settling === waiting) {
        settling = null;
      }
      for (const run of waiting) {
        run();
      }
    }, SETTLE);
  }
  const into = region;

  if (settling === null) {
    show(into);
  } else {
    settling.push(() => show(into));
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  node.className = className;
  node.append(...children);

  return node;
}

const SVG = 'http://www.w3.org/2000/svg';

// The line icons of the mockups the toasts draw.
const ICON_PATHS = {
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12l5 5 9-10',
} as const;

// A line icon of the mockups. Decoration: the words say the same.
function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  const line = document.createElementNS(SVG, 'path');
  const attributes = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };

  for (const [name, value] of Object.entries(attributes)) {
    svg.setAttribute(name, value);
  }
  line.setAttribute('d', path);
  svg.append(line);

  return svg;
}
