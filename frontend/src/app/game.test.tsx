import { describe, expect, it } from 'vitest';
import { readExercises } from './game';

function root(data?: string): HTMLElement {
  const element = document.createElement('div');

  if (data !== undefined) {
    element.dataset.game = data;
  }

  return element;
}

describe('data of the page', () => {
  // §5.1: Symfony puts the ready-made exercises into the page of the game.
  it('reads the ready-made exercises', () => {
    const data = JSON.stringify({ exercises: [{ id: 'push-ups', name: 'Віджимання' }] });

    expect(readExercises(root(data))).toEqual([{ id: 'push-ups', name: 'Віджимання' }]);
  });

  it('skips anything that is not an exercise', () => {
    const data = JSON.stringify({ exercises: [{ id: 'squats' }, 'pull-ups', { id: 'push-ups', name: 'Віджимання' }] });

    expect(readExercises(root(data))).toEqual([{ id: 'push-ups', name: 'Віджимання' }]);
    expect(readExercises(root(JSON.stringify({ exercises: {} })))).toEqual([]);
    expect(readExercises(root())).toEqual([]);
  });
});
