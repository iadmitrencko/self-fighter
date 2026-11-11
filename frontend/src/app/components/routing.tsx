import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

// A new screen starts at its top, as a new page would.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/**
 * The header and the footer of the site lead to screens of the game as well. Inside the game they
 * open a screen without loading the page again, so they work offline in the middle of a workout.
 * `base` is the address the router of this page lives under.
 */
export function SiteLinks({ base }: { base: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    const open = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;

      if (
        link === null ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target !== '' ||
        link.hasAttribute('download') ||
        link.origin !== window.location.origin ||
        (link.pathname !== base && !link.pathname.startsWith(`${base}/`))
      ) {
        return;
      }
      event.preventDefault();
      void navigate(`${link.pathname.slice(base.length) || '/'}${link.search}${link.hash}`);
    };

    document.addEventListener('click', open);

    return () => document.removeEventListener('click', open);
  }, [navigate, base]);

  return null;
}
