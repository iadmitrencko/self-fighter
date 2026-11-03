import { describe, expect, it } from 'vitest';
import { ladderConfig, targetConfig } from '../domain/testing/fixtures';
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
    expect(readPage(root())).toEqual({ exercises: [], challenge: null });
  });

  // §21.3: the page of /workout/challenge/{slug} carries the configuration of the challenge.
  it('reads the challenge the page opens', () => {
    const challenge = { slug: '100-push-ups', title: '100 віджимань', config: targetConfig() };

    expect(readPage(root({ exercises: [], challenge })).challenge).toEqual(challenge);
  });

  // A challenge passes the same check as the settings of a player.
  it('refuses a challenge the game cannot play', () => {
    const challenge = (config: unknown) => readPage(root({ challenge: { slug: 'a', title: 'A', config } })).challenge;

    expect(challenge({ ...ladderConfig(), max: 0 })).toBeNull();
    expect(challenge({ mode: 'target', rule: 'meet', rounds: 2, exercises: 3 })).toBeNull();
    expect(challenge('ladder')).toBeNull();
    expect(readPage(root({ challenge: { slug: 'a', config: ladderConfig() } })).challenge).toBeNull();
  });
});
