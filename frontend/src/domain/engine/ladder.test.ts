import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LADDER_MAX } from '../config/limits';
import { ladderSequence } from './ladder';

describe('ladderSequence', () => {
  // §9.3.
  it('climbs to the maximum', () => {
    expect(ladderSequence(5, false)).toEqual([1, 2, 3, 4, 5]);
  });

  // §9.4: the maximum is not repeated on the way down.
  it('returns down without repeating the maximum', () => {
    expect(ladderSequence(5, true)).toEqual([1, 2, 3, 4, 5, 4, 3, 2, 1]);
  });

  it('has a single stage for a maximum of 1', () => {
    expect(ladderSequence(1, false)).toEqual([1]);
    expect(ladderSequence(1, true)).toEqual([1]);
  });

  // §9.2: the technical limit gives 199 stages with the return.
  it('has 199 stages at the limit', () => {
    expect(ladderSequence(LADDER_MAX, true)).toHaveLength(199);
  });

  it('keeps its shape for every maximum', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: LADDER_MAX }), fc.boolean(), (max, returnDown) => {
        const sequence = ladderSequence(max, returnDown);
        const steps = sequence.slice(1).map((value, index) => value - (sequence[index] as number));

        expect(sequence).toHaveLength(returnDown ? 2 * max - 1 : max);
        expect(sequence.filter((value) => value === max)).toHaveLength(1);
        expect(steps.every((step) => Math.abs(step) === 1)).toBe(true);
        expect(Math.min(...sequence)).toBe(1);
        expect(sequence[0]).toBe(1);

        if (returnDown) {
          expect(sequence).toEqual([...sequence].reverse());
        }
      }),
    );
  });
});
