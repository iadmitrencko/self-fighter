import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createApiAnalytics } from '../../analytics/api';
import { createConsent, initConsentBanner } from '../../consent/consent';
import { createBrowserStorage } from '../../storage/api';
import { browserLocalStorage } from '../../storage/buffer';
import { newId } from '../../storage/ids';
import { readPage } from '../game';
import { KozakApp } from './KozakApp';
import { KOZAK_BASE } from './paths';
import './kozak.css';

// §24: the cossack game under /game. It shares the storage, the consent and the events of the site.
const root = document.getElementById('root');

if (root === null) {
  throw new Error('The #root element is missing.');
}

const storage = createBrowserStorage();
// Battles finished without the network go to the server as soon as the game opens again (§15.4).
void storage.attempts.flush();

const consent = createConsent(browserLocalStorage());
void initConsentBanner(consent);
const analytics = createApiAnalytics({
  allowed: () => consent.decision() === 'granted',
  fetch: (path, init) => globalThis.fetch(path, init),
});

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={KOZAK_BASE}>
      <KozakApp
        game={{
          storage,
          analytics,
          ...readPage(root),
          deps: { rng: Math.random, now: () => new Date(), newId },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
