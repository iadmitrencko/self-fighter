import { createConsent, initConsentBanner } from '../consent/consent';
import { browserLocalStorage } from '../storage/buffer';
import './site.css';

// §22: the banner asks every visitor once. The pages of the site send no events themselves.
void initConsentBanner(createConsent(browserLocalStorage()));
