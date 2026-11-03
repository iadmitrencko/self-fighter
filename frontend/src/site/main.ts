import { showScore } from '../score/score';
import { createBrowserStorage } from '../storage/api';
import './site.css';

// Twig renders the same page for everyone and reads no cookie: the score of the visitor and the
// challenges they passed come from the API (section 3.7 of the plan).
createBrowserStorage()
  .attempts.stats()
  .then((stats) => showScore(stats))
  .catch(() => undefined);
