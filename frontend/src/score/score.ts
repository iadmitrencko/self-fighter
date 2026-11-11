import type { Statistics } from '../domain/history/statistics';

/**
 * The score of the player in the frame of every page (site/_score.html.twig). Twig renders the
 * same page for everyone without reading a cookie, so the numbers arrive from the API (section 3.7
 * of the plan).
 */
export function showScore(stats: Statistics, root: ParentNode = document): void {
  const values: Record<string, number> = {
    total: stats.total,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
  };

  for (const element of root.querySelectorAll<HTMLElement>('[data-score]')) {
    const value = values[element.dataset.score ?? ''];

    if (value !== undefined) {
      element.textContent = String(value);
    }
  }
}
