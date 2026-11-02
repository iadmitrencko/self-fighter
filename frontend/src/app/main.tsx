import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createBrowserStorage } from '../storage/api';
import { newId } from '../storage/ids';
import { App } from './App';
import { readExercises } from './game';
import './app.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('The #root element is missing.');
}

const storage = createBrowserStorage();
// Attempts finished without the network go to the server as soon as the game opens again (§15.4).
void storage.attempts.flush();

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename="/workout">
      <App
        game={{
          storage,
          exercises: readExercises(root),
          deps: { rng: Math.random, now: () => new Date(), newId },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
