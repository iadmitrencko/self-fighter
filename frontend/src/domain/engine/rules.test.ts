import { describe, expect, it } from 'vitest';
import { ladderStageRule, passesTarget, stagePassed } from './rules';

describe('passesTarget', () => {
  // §6.5: a target of 10 under both rules.
  it.each([
    ['over', 9, false],
    ['over', 10, false],
    ['over', 11, true],
    ['meet', 9, false],
    ['meet', 10, true],
    ['meet', 11, true],
  ] as const)('with the %s rule, %i against 10 gives %s', (rule, actual, expected) => {
    expect(passesTarget(actual, 10, rule)).toBe(expected);
  });

  // §7.4: an equal result loses to the opponent under "over".
  it('treats an equal result as a loss under the over rule', () => {
    expect(passesTarget(34, 34, 'over')).toBe(false);
    expect(passesTarget(34, 34, 'meet')).toBe(true);
  });
});

describe('ladderStageRule', () => {
  // R2: the top stage counts at the maximum under both rules.
  it.each([
    [5, 5, 'over', 'meet'],
    [5, 5, 'meet', 'meet'],
    [4, 5, 'over', 'over'],
    [4, 5, 'meet', 'meet'],
  ] as const)('stage %i of %i with %s applies %s', (target, max, rule, expected) => {
    expect(ladderStageRule(target, max, rule)).toBe(expected);
  });
});

describe('stagePassed', () => {
  it('is false until a result is entered', () => {
    expect(stagePassed({ target: 0, rule: 'meet', actual: null })).toBe(false);
  });

  it('applies the rule of the stage', () => {
    expect(stagePassed({ target: 10, rule: 'over', actual: 11 })).toBe(true);
    expect(stagePassed({ target: 10, rule: 'over', actual: 10 })).toBe(false);
    expect(stagePassed({ target: 10, rule: 'meet', actual: 10 })).toBe(true);
  });
});
