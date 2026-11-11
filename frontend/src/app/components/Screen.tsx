import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { commonTexts } from '../../i18n/uk';
import { paths } from '../paths';
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
  // The landing is a page of the site, not a screen of the game.
  readonly site?: boolean;
}

export const BACK = {
  home: { to: '/', text: commonTexts.toHome, site: true },
  modes: { to: paths.modes, text: commonTexts.toModes },
  history: { to: paths.history, text: commonTexts.toHistory },
} satisfies Record<string, Back>;

// A link to a screen of this game or to a page of the site, which opens as a page.
export function PlaceLink({ place, className, children }: { place: Back; className: string; children: ReactNode }) {
  return place.site === true ? (
    <a className={className} href={place.to}>
      {children}
    </a>
  ) : (
    <Link className={className} to={place.to}>
      {children}
    </Link>
  );
}

export function BackLink({ back }: { back: Back }) {
  const content = (
    <>
      <Icon name="back" className="back-link__icon" />
      {back.text}
    </>
  );

  return back.site === true ? (
    <a className="back-link" href={back.to}>
      {content}
    </a>
  ) : (
    <Link className="back-link" to={back.to}>
      {content}
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
