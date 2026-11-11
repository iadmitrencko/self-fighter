import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';

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

// Every screen says where «back» leads, so nobody needs the button of the browser.
export interface Back {
  readonly to: string;
  readonly text: string;
}

export function BackLink({ back }: { back: Back }) {
  return (
    <Link className="back-link" to={back.to}>
      <Icon name="back" className="back-link__icon" />
      {back.text}
    </Link>
  );
}

export function ScreenHead({
  back,
  eyebrow,
  title,
}: {
  back: Back;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="screen-head">
      <BackLink back={back} />
      <div className="screen-head__text">
        {eyebrow !== undefined && <p className="eyebrow">{eyebrow}</p>}
        <Title className="screen-head__title">{title}</Title>
      </div>
    </header>
  );
}
