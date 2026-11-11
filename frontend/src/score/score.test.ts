import { describe, expect, it } from 'vitest';
import { showScore } from './score';

describe('score of the frame', () => {
  it('shows the numbers of the history', () => {
    const root = document.createElement('div');
    root.innerHTML = ['total', 'wins', 'draws', 'losses', 'unknown'].map((key) => `<b data-score="${key}">–</b>`).join('');

    showScore({ total: 12, wins: 8, draws: 1, losses: 3 }, root);

    expect([...root.querySelectorAll('b')].map((element) => element.textContent)).toEqual(['12', '8', '1', '3', '–']);
  });
});
