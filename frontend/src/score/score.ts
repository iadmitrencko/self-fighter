import type { Statistics } from '../domain/history/statistics';

/**
 * The score of the player in the frame of every page (site/_score.html.twig) and the marks of
 * the challenges passed. Twig renders the same page for everyone without reading a cookie, so the
 * numbers arrive from the API (section 3.7 of the plan).
 */
export function showScore(stats: Statistics, root: ParentNode = document): void {
  const passed = new Set(stats.challenges);
  const values: Record<string, number> = {
    total: stats.total,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    challenges: passed.size,
  };
  const onPage = new Set<string>();

  for (const element of root.querySelectorAll<HTMLElement>('[data-score]')) {
    const value = values[element.dataset.score ?? ''];

    if (value !== undefined) {
      element.textContent = String(value);
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-challenge]')) {
    const slug = element.dataset.challenge ?? '';

    onPage.add(slug);
    element.classList.toggle('is-passed', passed.has(slug));
  }
  // The catalog counts the challenges it lists.
  for (const element of root.querySelectorAll<HTMLElement>('[data-score-catalog]')) {
    element.textContent = String([...onPage].filter((slug) => passed.has(slug)).length);
  }
}
