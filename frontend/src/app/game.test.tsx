import { describe, expect, it } from 'vitest';
import { readPage } from './game';

function root(data?: unknown): HTMLElement {
  const element = document.createElement('div');

  if (data !== undefined) {
    element.dataset.game = JSON.stringify(data);
  }

  return element;
}

describe('data of the page', () => {
  // §5.1: Symfony puts the ready-made exercises into the page of the game.
  it('reads the ready-made exercises', () => {
    const data = { exercises: [{ id: 'push-ups', name: 'Віджимання' }] };

    expect(readPage(root(data)).exercises).toEqual([{ id: 'push-ups', name: 'Віджимання' }]);
  });

  it('skips anything that is not an exercise', () => {
    const data = { exercises: [{ id: 'squats' }, 'pull-ups', { id: 'push-ups', name: 'Віджимання' }] };

    expect(readPage(root(data)).exercises).toEqual([{ id: 'push-ups', name: 'Віджимання' }]);
    expect(readPage(root({ exercises: {} })).exercises).toEqual([]);
    expect(readPage(root())).toEqual({ exercises: [], signIn: [] });
  });

  // §23.2: the page names the ways to sign in this server offers.
  it('reads the ways to sign in', () => {
    expect(readPage(root({ exercises: [], signIn: ['google', 7] })).signIn).toEqual(['google']);
    expect(readPage(root({ exercises: [], signIn: 'google' })).signIn).toEqual([]);
  });
});
