import { describe, expect, it } from 'vitest';
import { showScore } from './score';

function page(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;

  return root;
}

const STATS = { total: 12, wins: 8, draws: 1, losses: 3, challenges: ['100-push-ups', 'squats-ladder-to-10'] };

describe('score of the frame', () => {
  it('shows the numbers of the history', () => {
    const root = page(
      ['total', 'wins', 'draws', 'losses', 'challenges', 'unknown'].map((key) => `<b data-score="${key}">–</b>`).join(''),
    );

    showScore(STATS, root);

    expect([...root.querySelectorAll('b')].map((element) => element.textContent)).toEqual(['12', '8', '1', '3', '2', '–']);
  });

  // §21.3: a challenge passed once stays marked on every page that lists it.
  it('marks the challenges passed and counts those of the page', () => {
    const root = page(`
      <article data-challenge="100-push-ups"></article>
      <article data-challenge="200-push-ups" class="is-passed"></article>
      <article data-challenge="100-push-ups"></article>
      <p data-score-catalog>0</p>
    `);

    showScore(STATS, root);

    expect([...root.querySelectorAll('article')].map((card) => card.classList.contains('is-passed'))).toEqual([true, false, true]);
    expect(root.querySelector('[data-score-catalog]')?.textContent).toBe('1');
  });
});
