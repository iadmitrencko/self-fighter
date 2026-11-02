import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { commonTexts } from '../../i18n/uk';
import { paths } from '../paths';
import { Icon } from './Icon';

// One screen of the game. The browser tab shows its title.
export function Screen({
  title,
  wide = false,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — Self-Fighter`;
  }, [title]);

  return <main className={wide ? 'screen screen--wide' : 'screen'}>{children}</main>;
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

// The top of the first screen: the logo leads back to the site, the icons to the history and the data.
export function AppBar() {
  return (
    <header className="app-bar">
      <a className="logo" href="/" aria-label={commonTexts.home}>
        <svg className="logo__mark" viewBox="0 0 36 36" aria-hidden="true">
          <path className="logo__you" d="M3 6 16 18 3 30Z" />
          <path className="logo__rival" d="M33 6 20 18 33 30Z" />
        </svg>
        Self-Fighter
      </a>
      <nav className="app-bar__links">
        <Link className="icon-button" to={paths.history} aria-label={commonTexts.history}>
          <Icon name="history" />
        </Link>
        <Link className="icon-button" to={paths.account} aria-label={commonTexts.account}>
          <Icon name="user" />
        </Link>
      </nav>
    </header>
  );
}

// A screen one step away from another: the back link, a small label and the heading.
export function ScreenHead({
  back,
  backLabel = commonTexts.back,
  eyebrow,
  title,
}: {
  back: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="screen-head">
      <Link className="icon-button" to={back} aria-label={backLabel}>
        <Icon name="back" />
      </Link>
      <div className="screen-head__text">
        {eyebrow !== undefined && <p className="eyebrow">{eyebrow}</p>}
        <Title className="screen-head__title">{title}</Title>
      </div>
    </header>
  );
}
