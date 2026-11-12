import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FightConfig } from '../../../domain/config/types';
import { createSession } from '../../../domain/engine/session';
import { enterBattle } from '../../../domain/kozak/battle';
import { fightConfig, pushUps, squats, testDeps } from '../../../domain/testing/fixtures';
import { createMemoryStorage } from '../../../storage/memory';
import { renderKozak } from '../../testing/render';

// A fight that has taken its energy and waits for its first set.
function started(config: FightConfig = fightConfig()) {
  const storage = createMemoryStorage();
  const session = enterBattle(createSession(config, testDeps()), 'fight', null);

  if (session === null) {
    throw new Error('A full pool refuses no fight');
  }
  storage.gameSessions.fight.save(session);

  return { storage, session };
}

async function battle() {
  const dialog = await screen.findByRole('dialog', { name: 'Бій' });

  return {
    dialog: within(dialog),
    set: () => dialog.querySelector('.k-battle__set')?.textContent,
    exercise: () => dialog.querySelector('.k-battle__label--gold')?.textContent,
    reps: () => dialog.querySelector('.k-battle__reps')?.textContent,
  };
}

describe('a fight', () => {
  // §6: every exercise of a round, then the next round, each set done when the player says so.
  it('goes set by set, round by round, and ends with its result', async () => {
    const { storage } = started({
      mode: 'fight',
      exercises: [
        { ...pushUps, sets: [10, 12] },
        { ...squats, sets: [15, 20] },
      ],
    });
    const { user, analytics } = renderKozak('/fight/battle', { storage });
    const view = await battle();

    expect(view.dialog.getByText('2 вправи · 2 раунди')).toBeTruthy();
    const steps: (string | null | undefined)[][] = [];

    for (let set = 0; set < 4; set += 1) {
      steps.push([view.set(), view.exercise(), view.reps()]);
      await user.click(view.dialog.getByRole('button', { name: 'Підхід виконано' }));
    }

    expect(steps).toEqual([
      ['1 / 2', 'Віджимання', '10'],
      ['1 / 2', 'Присідання', '15'],
      ['2 / 2', 'Віджимання', '12'],
      ['2 / 2', 'Присідання', '20'],
    ]);
    expect(await view.dialog.findByText('Усі підходи виконано')).toBeTruthy();
    expect(view.dialog.getByText('57 з 57 повторень')).toBeTruthy();

    await user.click(view.dialog.getByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій виграно' })).toBeTruthy();
    expect(storage.gameSessions.fight.load()).toBeNull();
    expect((await storage.attempts.game()).fights).toEqual({ wins: 1, draws: 0, losses: 0 });
    expect(analytics.events).toEqual([{ name: 'workout_completed', mode: 'fight', outcome: 'win' }]);
  });

  // A reload in the middle of a fight continues it.
  it('continues where it stopped', async () => {
    const { storage } = started();
    const view = renderKozak('/fight/battle', { storage });
    await view.user.click((await battle()).dialog.getByRole('button', { name: 'Підхід виконано' }));
    view.unmount();

    renderKozak('/fight/battle', { storage });
    const again = await battle();

    expect([again.set(), again.exercise(), again.reps()]).toEqual(['1 / 3', 'Присідання', '15']);
  });

  // §6, §24.6: leaving a fight loses it, so the game asks first.
  it('is lost by a retreat', async () => {
    const { storage, session } = started();
    const { user } = renderKozak('/fight/battle', { storage });
    const view = await battle();

    await user.click(view.dialog.getByRole('button', { name: 'Завершити' }));
    const question = within(screen.getByRole('dialog', { name: 'Відступити з бою?' }));
    expect(question.getByText(/^Підходи, що лишилися, не буде виконано/)).toBeTruthy();
    await user.click(question.getByRole('button', { name: 'Продовжити бій' }));

    expect(storage.gameSessions.fight.load()).toEqual(session);

    await user.click(view.dialog.getByRole('button', { name: 'Завершити' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Відступити з бою?' })).getByRole('button', { name: 'Відступити' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Бій програно' })).toBeTruthy();
    expect((await storage.attempts.game()).fights.losses).toBe(1);
  });

  // A fight of many sets shows them as one bar.
  it('shows a long fight as one bar', async () => {
    const exercises = [pushUps, squats, { id: 'burpees', name: 'Бурпі' }, { id: 'lunges', name: 'Випади' }];
    const { storage } = started({ mode: 'fight', exercises: exercises.map((exercise) => ({ ...exercise, sets: Array.from({ length: 10 }, () => 5) })) });
    renderKozak('/fight/battle', { storage });
    const view = await battle();

    expect(view.dialog.getByRole('progressbar', { name: 'Підходи' }).classList.contains('k-battle__bar')).toBe(true);
  });
});
