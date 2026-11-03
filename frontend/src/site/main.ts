import { createConsent, initConsentBanner } from '../consent/consent';
import { showScore } from '../score/score';
import { createBrowserStorage } from '../storage/api';
import { browserLocalStorage } from '../storage/buffer';
import './site.css';

// §22: the banner asks every visitor once. The pages of the site send no events themselves.
void initConsentBanner(createConsent(browserLocalStorage()));

// Twig renders the same page for everyone and reads no cookie: the score of the visitor and the
// challenges they passed come from the API (section 3.7 of the plan).
createBrowserStorage()
  .attempts.stats()
  .then((stats) => showScore(stats))
  .catch(() => undefined);
