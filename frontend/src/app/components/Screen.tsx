import { useEffect, useRef, type ReactNode } from 'react';

// One screen of the game inside the frame of the site. The browser tab shows its title.
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — Self-Fighter`;
  }, [title]);

  return <div className="screen">{children}</div>;
}

// The heading takes the focus when a screen opens, so a screen reader starts reading from it.
export function Title({ children, className }: { children: ReactNode; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <h1 ref={heading} tabIndex={-1} className={className}>
      {children}
    </h1>
  );
}
