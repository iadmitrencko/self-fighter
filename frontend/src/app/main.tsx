import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createApiAnalytics } from '../analytics/api';
import { createConsent, initConsentBanner } from '../consent/consent';
import { createBrowserStorage } from '../storage/api';
import { browserLocalStorage } from '../storage/buffer';
import { newId } from '../storage/ids';
import { App } from './App';
import { readPage } from './game';
import { BASE } from './paths';
import './app.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('The #root element is missing.');
}

const storage = createBrowserStorage();
// Attempts finished without the network go to the server as soon as the game opens again (§15.4).
void storage.attempts.flush();

// The game lives in the frame of the site, with the same banner of consent (§22).
const consent = createConsent(browserLocalStorage());
void initConsentBanner(consent);
const analytics = createApiAnalytics({
  allowed: () => consent.decision() === 'granted',
  fetch: (path, init) => globalThis.fetch(path, init),
});

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={BASE}>
      <App
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
