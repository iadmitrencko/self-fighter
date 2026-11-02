import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';
import { counts } from './uk';

describe('plural forms', () => {
  it.each([
    [1, '1 раунд'],
    [2, '2 раунди'],
    [5, '5 раундів'],
    [11, '11 раундів'],
    [21, '21 раунд'],
    [22, '22 раунди'],
  ])('says %i rounds as «%s»', (count, text) => {
    expect(counts.rounds(count)).toBe(text);
  });

  it('agrees the rest of the words with numbers as well', () => {
    expect([counts.exercises(3), counts.stages(9), counts.wins(1), counts.losses(5)]).toEqual([
      '3 вправи',
      '9 етапів',
      '1 перемога',
      '5 поразок',
    ]);
  });
});

describe('durations', () => {
  it.each([
    [0, '0:00'],
    [59_400, '0:59'],
    [1_104_000, '18:24'],
    [3_723_000, '1:02:03'],
  ])('shows %i ms as %s', (milliseconds, text) => {
    expect(formatDuration(milliseconds)).toBe(text);
  });
});
