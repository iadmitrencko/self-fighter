import { describe, expect, it } from 'vitest';
import { allLevels, findCampaign, findLevel, findStage, SICH, totalReps } from './journey';

const ravens = findCampaign(SICH, 'forest-ravens');

describe('the journey «Січ»', () => {
  // §24.5: three campaigns in the order of the story and the final battle.
  it('has its campaigns in the order of the story', () => {
    expect(SICH.campaigns.map(({ id, exercise, peak, final }) => ({ id, exercise, peak, final }))).toEqual([
      { id: 'black-flag', exercise: 'push-ups', peak: 25, final: false },
      { id: 'steppe-wolves', exercise: 'squats', peak: 50, final: false },
      { id: 'forest-ravens', exercise: 'pull-ups', peak: 10, final: false },
      { id: 'final-battle', exercise: null, peak: null, final: true },
    ]);
  });

  it('gives the glory of the brief', () => {
    expect(SICH.rewards).toEqual({ level: 2, boss: 5, campaign: 10, journey: 30 });
  });

  // §24.5: «Лісові круки» has ten stages and 61 levels, a boss at the end of each stage.
  it('has the stages and levels of «Лісові круки»', () => {
    expect(ravens?.stages.map(({ levels }) => levels.length)).toEqual([4, 7, 7, 6, 6, 6, 6, 6, 6, 7]);
    expect(allLevels(SICH)).toHaveLength(61);
    expect(ravens?.stages.every(({ levels }) => levels.map(({ boss }) => boss).lastIndexOf(true) === levels.length - 1)).toBe(true);
    expect(allLevels(SICH).filter(({ boss }) => boss)).toHaveLength(10);
  });

  // The column «Повторень загалом» of the brief, stage by stage.
  it('asks the repetitions of the brief', () => {
    expect(ravens?.stages.map(({ levels }) => levels.map(totalReps))).toEqual([
      [3, 4, 5, 10],
      [4, 5, 6, 7, 8, 8, 20],
      [8, 9, 10, 10, 11, 12, 30],
      [13, 10, 17, 10, 18, 16],
      [17, 15, 18, 19, 15, 25],
      [21, 21, 22, 23, 22, 36],
      [25, 28, 26, 27, 26, 49],
      [29, 36, 30, 31, 30, 64],
      [33, 45, 34, 35, 34, 81],
      [37, 55, 38, 39, 38, 40, 100],
    ]);
  });

  it('never asks more than the peak of the campaign in one set', () => {
    expect(Math.max(...allLevels(SICH).flatMap(({ sets }) => sets))).toBe(10);
  });

  // A ladder up climbs from one, a ladder with a return comes back down to one.
  it('builds the ladders as their types say', () => {
    for (const { type, sets } of allLevels(SICH)) {
      const top = Math.max(...sets);
      const climb = Array.from({ length: top }, (_, index) => index + 1);

      if (type === 'ladder-up') {
        expect(sets).toEqual(climb);
      }
      if (type === 'ladder-return') {
        expect(sets).toEqual([...climb, ...climb.slice(0, -1).reverse()]);
      }
      if (type === 'ladder-down') {
        expect([...sets].sort((a, b) => b - a)).toEqual(sets);
        expect(sets.at(-1)).toBe(1);
      }
    }
  });

  it('names every level by its campaign, stage and number', () => {
    expect(findLevel(SICH, 'forest-ravens/2/3')).toEqual({
      id: 'forest-ravens/2/3',
      campaign: 'forest-ravens',
      stage: 2,
      number: 3,
      type: 'ladder-up',
      boss: false,
      sets: [1, 2, 3],
    });
    expect(findLevel(SICH, 'forest-ravens/10/7')).toMatchObject({ boss: true, type: 'ladder-return' });
    expect(findLevel(SICH, 'forest-ravens/1/4')).toMatchObject({ boss: true, type: 'normal', sets: Array<number>(10).fill(1) });
    expect(new Set(allLevels(SICH).map(({ id }) => id)).size).toBe(61);
  });

  it('finds nothing that does not exist', () => {
    expect(findCampaign(SICH, 'white-swans')).toBeNull();
    expect(findLevel(SICH, 'forest-ravens/1/5')).toBeNull();
    expect(findStage(ravens ?? (undefined as never), 11)).toBeNull();
    expect(findStage(ravens ?? (undefined as never), 3)?.levels).toHaveLength(7);
  });
});
