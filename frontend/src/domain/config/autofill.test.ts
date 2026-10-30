import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  columnTargets,
  createTargetColumn,
  ensureRounds,
  fillAllRounds,
  setRoundTarget,
  type TargetColumn,
} from './autofill';

const values = (column: TargetColumn) => column.map(({ value }) => value);

describe('target autofill', () => {
  it('starts with empty cells: an empty cell is not zero', () => {
    expect(createTargetColumn(3)).toEqual([
      { value: null, manual: false },
      { value: null, manual: false },
      { value: null, manual: false },
    ]);
  });

  // §6.4, step 3.
  it('copies the first round into the rounds not set by hand', () => {
    const column = setRoundTarget(createTargetColumn(3), 0, 10);

    expect(values(column)).toEqual([10, 10, 10]);
    expect(column.every(({ manual }) => !manual)).toBe(true);
  });

  // §6.4, steps 4 and 5.
  it('changes a single round without touching the others', () => {
    const filled = setRoundTarget(createTargetColumn(3), 0, 10);

    const column = setRoundTarget(filled, 1, 12);

    expect(values(column)).toEqual([10, 12, 10]);
    expect(column[1]?.manual).toBe(true);
  });

  // §6.4: autofill must not destroy manual values.
  it('keeps manual rounds when the first round changes', () => {
    const edited = setRoundTarget(setRoundTarget(createTargetColumn(5), 0, 10), 2, 15);

    const column = setRoundTarget(edited, 0, 20);

    expect(values(column)).toEqual([20, 20, 15, 20, 20]);
  });

  it('keeps a manual round that equals the first round', () => {
    const edited = setRoundTarget(setRoundTarget(createTargetColumn(2), 0, 10), 1, 10);

    expect(values(setRoundTarget(edited, 0, 20))).toEqual([20, 10]);
  });

  it('empties the automatic rounds along with the first one', () => {
    const filled = setRoundTarget(createTargetColumn(2), 0, 10);

    expect(values(setRoundTarget(filled, 0, null))).toEqual([null, null]);
  });

  // An emptied round holds no user value, so it follows the first round again.
  it('returns an emptied round to automatic filling', () => {
    const edited = setRoundTarget(setRoundTarget(createTargetColumn(2), 0, 10), 1, 15);

    const emptied = setRoundTarget(edited, 1, null);

    expect(emptied[1]).toEqual({ value: null, manual: false });
    expect(values(setRoundTarget(emptied, 0, 20))).toEqual([20, 20]);
  });

  // Design: "Заповнити всі" overwrites all rounds with the value of the first one.
  it('overwrites every round on the explicit action', () => {
    const edited = setRoundTarget(setRoundTarget(createTargetColumn(3), 0, 10), 1, 15);

    const column = fillAllRounds(edited);

    expect(values(column)).toEqual([10, 10, 10]);
    expect(column.every(({ manual }) => !manual)).toBe(true);
  });

  it('leaves an empty column as it is', () => {
    expect(fillAllRounds([])).toEqual([]);
  });

  it('fills new rounds with the first value', () => {
    const column = ensureRounds(setRoundTarget(createTargetColumn(2), 0, 10), 4);

    expect(values(column)).toEqual([10, 10, 10, 10]);
  });

  it('keeps new rounds automatic', () => {
    const column = ensureRounds(setRoundTarget(createTargetColumn(1), 0, 10), 3);

    expect(values(setRoundTarget(column, 0, 20))).toEqual([20, 20, 20]);
  });

  it('adds empty rounds to an unfilled column', () => {
    expect(values(ensureRounds(createTargetColumn(1), 2))).toEqual([null, null]);
  });

  // Section 9 of the plan: a misclick on the stepper must not lose manual targets.
  it('keeps the rounds removed before the start', () => {
    const edited = setRoundTarget(setRoundTarget(createTargetColumn(3), 0, 10), 2, 15);

    const shrunk = ensureRounds(edited, 2);

    expect(shrunk).toEqual(edited);
    expect(columnTargets(shrunk, 2)).toEqual([10, 10]);
    expect(columnTargets(ensureRounds(shrunk, 3), 3)).toEqual([10, 10, 15]);
  });

  it('gives the form one target per round', () => {
    const column = setRoundTarget(createTargetColumn(4), 0, 10);

    expect(columnTargets(column, 2)).toEqual([10, 10]);
  });

  // §18: autofill never overwrites manual changes.
  it('never changes a manual value for any sequence of edits', () => {
    const editArbitrary = fc.record({
      round: fc.integer({ min: 0, max: 9 }),
      value: fc.option(fc.integer({ min: 0, max: 9999 })),
    });

    fc.assert(
      fc.property(fc.array(editArbitrary, { maxLength: 40 }), (edits) => {
        const manual = new Map<number, number | null>();
        let column = createTargetColumn(10);

        for (const { round, value } of edits) {
          column = setRoundTarget(column, round, value);

          if (round > 0) {
            manual.set(round, value);
          }
        }

        for (const [round, value] of manual) {
          if (value !== null) {
            expect(column[round]).toEqual({ value, manual: true });
          }
        }

        const first = column[0]?.value;

        column.forEach((cell, index) => {
          if (!manual.has(index) && index > 0) {
            expect(cell).toEqual({ value: first, manual: false });
          }
        });
      }),
    );
  });
});
