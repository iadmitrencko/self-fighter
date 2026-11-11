import { describe, expect, it } from 'vitest';
import { lookOf, rankGroups, RANKS, standingOf } from './ranks';

describe('ranks', () => {
  // §24.2: the glory each rank needs, from the brief.
  it('follow the table of the brief', () => {
    expect(RANKS.map(({ glory }) => glory)).toEqual([
      0, 10, 25, 45, 70, 100, 140, 190, 250, 330, 430, 550, 700, 900, 1150, 1450, 1800, 2250, 2800, 3500,
    ]);
    expect(RANKS[0].id).toBe('dzhura');
    expect(RANKS.at(-1)?.id).toBe('hetman');
  });

  it('need more glory for every next rank', () => {
    const steps = RANKS.slice(1).map(({ glory }, index) => glory - (RANKS[index]?.glory ?? 0));

    expect(steps).toEqual([10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 350, 450, 550, 700]);
  });

  it('give a beginner the first rank', () => {
    expect(standingOf(0)).toEqual({
      glory: 0,
      rank: { id: 'dzhura', glory: 0 },
      number: 1,
      next: { id: 'zastavnyi', glory: 10 },
      look: 'recruit',
    });
  });

  it('change exactly at their thresholds', () => {
    expect(standingOf(9).rank.id).toBe('dzhura');
    expect(standingOf(10).rank.id).toBe('zastavnyi');
    expect(standingOf(44)).toMatchObject({ number: 3, rank: { id: 'roiovyi' } });
    expect(standingOf(45)).toMatchObject({ number: 4, rank: { id: 'kozak' }, look: 'cossack' });
  });

  it('end with the hetman', () => {
    expect(standingOf(3500)).toMatchObject({ number: 20, rank: { id: 'hetman' }, next: null, look: 'hetman' });
    expect(standingOf(100_000)).toMatchObject({ number: 20, next: null });
  });

  it('never go below the first rank', () => {
    expect(standingOf(-5)).toMatchObject({ glory: 0, number: 1 });
  });

  // The page of the ranks shows them by the look they give.
  it('fall into a group for each look', () => {
    expect(rankGroups().map(({ look, first, last, ranks }) => [look, first, last, ranks.length])).toEqual([
      ['recruit', 1, 3, 3],
      ['cossack', 4, 9, 6],
      ['officer', 10, 14, 5],
      ['general', 15, 19, 5],
      ['hetman', 20, 20, 1],
    ]);
    expect(rankGroups().flatMap(({ ranks }) => ranks)).toEqual(RANKS);
  });

  // §24.2: the five looks of the cossack.
  it('dress the cossack by the rank', () => {
    expect(RANKS.map(({ id }) => lookOf(id))).toEqual([
      ...Array<string>(3).fill('recruit'),
      ...Array<string>(6).fill('cossack'),
      ...Array<string>(5).fill('officer'),
      ...Array<string>(5).fill('general'),
      'hetman',
    ]);
  });
});
