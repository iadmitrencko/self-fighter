import { describe, expect, it } from 'vitest';
import { ladderConfig, pushUps, squats, targetConfig } from '../testing/fixtures';
import { keepsChallenge } from './challenge';

describe('keepsChallenge', () => {
  // §21.3: the page of a challenge comes from the server, which keeps its own order of fields.
  it('takes the settings of the page in any order and with any names of exercises', () => {
    const challenge = targetConfig({ rule: 'meet', exercises: [{ ...pushUps, targets: [10, 10] }] });
    const reordered = JSON.parse(
      '{"rounds":2,"exercises":[{"targets":[10,10],"name":"Push-ups","id":"push-ups"}],"rule":"meet","mode":"target"}',
    ) as typeof challenge;

    expect(keepsChallenge(reordered, challenge)).toBe(true);
    expect(keepsChallenge(ladderConfig(), ladderConfig({ exercise: { ...ladderConfig().exercise, name: 'Pull-ups' } }))).toBe(true);
  });

  // A changed challenge is a workout of its own, harder or easier.
  it.each([
    ['another target', targetConfig({ exercises: [{ ...pushUps, targets: [10, 12] }, { ...squats, targets: [20, 26] }] })],
    ['another rule', targetConfig({ rule: 'meet' })],
    ['another round', targetConfig({ rounds: 3, exercises: [{ ...pushUps, targets: [10, 12, 12] }, { ...squats, targets: [20, 25, 25] }] })],
    ['another exercise', targetConfig({ exercises: [{ ...pushUps, targets: [10, 12] }] })],
    ['another mode', ladderConfig()],
  ])('refuses %s', (_, config) => {
    expect(keepsChallenge(config, targetConfig())).toBe(false);
  });

  it('tells a ladder by its top and its way down', () => {
    expect(keepsChallenge(ladderConfig({ max: 6 }), ladderConfig())).toBe(false);
    expect(keepsChallenge(ladderConfig({ returnDown: false }), ladderConfig())).toBe(false);
  });
});
