import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { FightStage } from '../engine/rules';
import { createSession, submitResult } from '../engine/session';
import {
  cycleOffsets,
  ladderConfig,
  ladderConfigArbitrary,
  offsetsArbitrary,
  play,
  pushUps,
  squats,
  targetConfig,
  targetConfigArbitrary,
  testDeps,
} from '../testing/fixtures';
import { computeFightResult, computeLadderResult, type FightResult } from './results';

function fightStage(round: number, target: number, actual: number | null): FightStage {
  return { round, exercise: pushUps, target, rule: 'over', actual };
}

// Each inner array is one round, each number is the result against a target of 10.
function fightOf(rounds: readonly (readonly number[])[]): FightResult {
  return computeFightResult(
    rounds.flatMap((results, round) => results.map((actual) => fightStage(round, 10, actual))),
  );
}

const WIN = 11;
const LOSS = 10;

function ladderOf(max: number, returnDown: boolean, results: readonly number[]) {
  const { stages } = createSession(ladderConfig({ max, returnDown }), testDeps());

  return computeLadderResult(
    stages.map((stage, index) => ({ ...stage, actual: results[index] ?? null })),
  );
}

describe('computeFightResult', () => {
  // §6.6: a round is decided by exercises.
  it.each([
    ['win', [WIN, WIN, LOSS], 2, 1],
    ['loss', [WIN, LOSS, LOSS], 1, 2],
    ['draw', [WIN, LOSS], 1, 1],
  ] as const)('gives a round of %s', (outcome, results, won, lost) => {
    expect(fightOf([results]).rounds[0]).toMatchObject({ outcome, won, lost });
  });

  // §6.7: a fight is decided by rounds.
  it.each([
    ['win', [[WIN], [WIN], [LOSS]], 2, 0, 1],
    ['loss', [[WIN], [LOSS], [LOSS]], 1, 0, 2],
    ['draw', [[WIN], [LOSS]], 1, 0, 1],
    ['draw', [[WIN], [LOSS], [WIN, LOSS]], 1, 1, 1],
    ['win', [[WIN], [WIN, LOSS]], 1, 1, 0],
    ['draw', [[WIN, LOSS], [WIN, LOSS]], 0, 2, 0],
  ] as const)('gives a fight of %s from rounds %j', (outcome, rounds, won, drawn, lost) => {
    expect(fightOf(rounds)).toMatchObject({ outcome, won, drawn, lost });
  });

  // §6.7: the total number of repetitions does not decide the winner.
  it.each([
    ['win', [fightStage(0, 10, 11), fightStage(1, 10, 11), fightStage(2, 100, 0)]],
    ['loss', [fightStage(0, 10, 9), fightStage(1, 10, 9), fightStage(2, 10, 9999)]],
  ] as const)('gives a %s by rounds, whatever the total of repetitions', (outcome, stages) => {
    expect(computeFightResult(stages).outcome).toBe(outcome);
  });

  it('keeps the target and the result of every exercise', () => {
    const stages: FightStage[] = [
      { round: 0, exercise: pushUps, target: 22, rule: 'over', actual: 18 },
      { round: 0, exercise: squats, target: 30, rule: 'meet', actual: 30 },
    ];

    expect(computeFightResult(stages).rounds[0]?.exercises).toEqual([
      { exercise: pushUps, target: 22, actual: 18, outcome: 'loss' },
      { exercise: squats, target: 30, actual: 30, outcome: 'win' },
    ]);
  });

  // Fight screen: the score counts finished rounds only.
  it('gives the running score of a fight in progress', () => {
    const session = createSession(targetConfig(), testDeps());
    const firstRoundWon = submitResult(submitResult(session, 0, 11), 1, 21);
    const secondRoundStarted = submitResult(firstRoundWon, 2, 0);

    expect(computeFightResult(secondRoundStarted.stages)).toMatchObject({
      won: 1,
      drawn: 0,
      lost: 0,
    });
    expect(computeFightResult(secondRoundStarted.stages).rounds).toHaveLength(1);
  });

  it('treats an empty fight as a draw of nothing', () => {
    expect(computeFightResult([])).toEqual({
      rounds: [],
      won: 0,
      drawn: 0,
      lost: 0,
      outcome: 'draw',
    });
  });

  it('keeps the counters consistent for any fight', () => {
    fc.assert(
      fc.property(targetConfigArbitrary, offsetsArbitrary, (config, offsets) => {
        const session = play(createSession(config, testDeps()), cycleOffsets(offsets));
        const { rounds, won, drawn, lost, outcome } = computeFightResult(session.stages);

        expect(rounds).toHaveLength(config.rounds);
        expect(won + drawn + lost).toBe(config.rounds);
        expect(outcome).toBe(won > lost ? 'win' : won < lost ? 'loss' : 'draw');

        for (const round of rounds) {
          expect(round.won + round.lost).toBe(config.exercises.length);
          expect(round.outcome).toBe(
            round.won > round.lost ? 'win' : round.won < round.lost ? 'loss' : 'draw',
          );
        }
      }),
    );
  });
});

describe('computeLadderResult', () => {
  // §9.5: the example for a maximum of 5 with the return under the over rule.
  it('wins with the results listed in the specification', () => {
    const result = ladderOf(5, true, [2, 3, 4, 5, 5, 5, 4, 3, 2]);

    expect(result).toMatchObject({ outcome: 'win', maxPassed: 5, passedCount: 9 });
  });

  it('loses when any listed result is one less', () => {
    const required = [2, 3, 4, 5, 5, 5, 4, 3, 2];

    required.forEach((_, failed) => {
      const results = required.map((value, index) => (index === failed ? value - 1 : value));

      expect(ladderOf(5, true, results.slice(0, failed + 1)).outcome).toBe('loss');
    });
  });

  // §9.5: a return ladder counts as won only after the way down.
  it('does not count the climb alone as a win', () => {
    expect(ladderOf(5, true, [2, 3, 4, 5, 5]).outcome).toBe('loss');
  });

  // §9.3.
  it('wins a ladder without the return at the top', () => {
    expect(ladderOf(5, false, [2, 3, 4, 5, 5])).toMatchObject({
      outcome: 'win',
      passedCount: 5,
    });
  });

  // Plan §8: a failure on the first stage leaves nothing passed.
  it('gives zero when the first stage fails', () => {
    expect(ladderOf(5, true, [1])).toMatchObject({
      outcome: 'loss',
      maxPassed: 0,
      passedCount: 0,
    });
  });

  // Design: stage 7 of 9 failed gives a maximum of 5 and 6 passed stages.
  it('reports the highest passed stage after a failure on the way down', () => {
    expect(ladderOf(5, true, [2, 3, 4, 5, 5, 5, 3])).toMatchObject({
      outcome: 'loss',
      maxPassed: 5,
      passedCount: 6,
    });
  });

  it('wins a single-stage ladder at the maximum under both rules', () => {
    expect(ladderOf(1, true, [1]).outcome).toBe('win');
    expect(ladderOf(1, true, [0]).outcome).toBe('loss');
  });

  // §9.6: the whole sequence stays in the result, with gaps after the failure.
  it('keeps the full sequence of stages', () => {
    expect(ladderOf(3, false, [2, 2]).stages).toEqual([
      { target: 1, actual: 2, passed: true },
      { target: 2, actual: 2, passed: false },
      { target: 3, actual: null, passed: false },
    ]);
  });

  it('agrees with the rule of each stage for any ladder', () => {
    fc.assert(
      fc.property(ladderConfigArbitrary, offsetsArbitrary, (config, offsets) => {
        const session = play(createSession(config, testDeps()), cycleOffsets(offsets));
        const { stages, passedCount, maxPassed, outcome } = computeLadderResult(session.stages);
        const failed = stages.filter(({ actual, passed }) => actual !== null && !passed);

        expect(failed.length).toBeLessThanOrEqual(1);
        expect(outcome === 'win').toBe(passedCount === stages.length);
        expect(outcome === 'win').toBe(failed.length === 0);
        expect(maxPassed).toBeLessThanOrEqual(config.max);
        expect(stages.slice(0, passedCount).every(({ passed }) => passed)).toBe(true);

        if (outcome === 'win') {
          expect(maxPassed).toBe(config.max);
        }
      }),
    );
  });

  // R2: the maximum is enough for the top stage under both rules.
  it('never demands more than the maximum', () => {
    fc.assert(
      fc.property(ladderConfigArbitrary, (config) => {
        const session = play(createSession(config, testDeps()), ({ target, rule }) =>
          Math.min(config.max, rule === 'over' ? target + 1 : target),
        );

        expect(computeLadderResult(session.stages).outcome).toBe('win');
      }),
    );
  });
});
