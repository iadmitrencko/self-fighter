import { describe, expect, it } from 'vitest';
import { allLevels, findCampaign, findLevel, findStage, SICH, totalReps } from './journey';

const ravens = findCampaign(SICH, 'forest-ravens');
const flag = findCampaign(SICH, 'black-flag');
const wolves = findCampaign(SICH, 'steppe-wolves');
// Every number is larger than the one before it.
const climbs = (numbers: readonly number[]) => numbers.every((n, index) => index === 0 || n > (numbers[index - 1] ?? n));
const bossLast = ({ stages }: { stages: readonly { levels: readonly { boss: boolean }[] }[] }) =>
  stages.every(({ levels }) => levels.map(({ boss }) => boss).lastIndexOf(true) === levels.length - 1);

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
    expect(SICH.rewards).toEqual({ level: 2, boss: 5, campaign: 10, round: 5, journey: 30 });
  });

  // §24.5: «Лісові круки» has ten stages and 61 levels, a boss at the end of each stage.
  it('has the stages and levels of «Лісові круки»', () => {
    expect(ravens?.stages.map(({ levels }) => levels.length)).toEqual([4, 7, 7, 6, 6, 6, 6, 6, 6, 7]);
    expect(bossLast(ravens ?? (undefined as never))).toBe(true);
  });

  // §24.5: «Чорний прапор» has ten stages of six levels, a boss at the end of each stage.
  it('has the stages and levels of «Чорний прапор»', () => {
    expect(flag?.stages.map(({ levels }) => levels.length)).toEqual(Array<number>(10).fill(6));
    expect(bossLast(flag ?? (undefined as never))).toBe(true);
  });

  // §24.5: «Степові вовки» has ten stages of six levels, a boss at the end of each stage.
  it('has the stages and levels of «Степові вовки»', () => {
    expect(wolves?.stages.map(({ levels }) => levels.length)).toEqual(Array<number>(10).fill(6));
    expect(bossLast(wolves ?? (undefined as never))).toBe(true);
  });

  it('has one boss in every stage', () => {
    expect(allLevels(SICH)).toHaveLength(181);
    expect(allLevels(SICH).filter(({ boss }) => boss)).toHaveLength(30);
  });

  // The column «Повторень загалом» of the brief, stage by stage.
  it('asks the repetitions of the brief of «Лісові круки»', () => {
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

  it('asks the repetitions of the brief of «Чорний прапор»', () => {
    expect(flag?.stages.map(({ levels }) => levels.map(totalReps))).toEqual([
      [4, 5, 6, 6, 7, 9],
      [7, 8, 14, 10, 12, 13],
      [13, 17, 16, 22, 22, 30],
      [22, 25, 26, 29, 30, 37],
      [30, 33, 34, 38, 38, 50],
      [38, 41, 42, 44, 46, 55],
      [42, 45, 47, 49, 51, 67],
      [49, 52, 51, 57, 60, 71],
      [53, 57, 54, 61, 65, 83],
      [57, 61, 59, 65, 70, 85],
    ]);
    // The column «Максимум повторень у підході» of the stages.
    expect(flag?.stages.map(({ levels }) => Math.max(...levels.flatMap(({ sets }) => sets)))).toEqual([
      3, 5, 8, 11, 14, 17, 19, 21, 23, 25,
    ]);
  });

  it('asks the repetitions of the brief of «Степові вовки»', () => {
    expect(wolves?.stages.map(({ levels }) => levels.map(totalReps))).toEqual([
      [8, 10, 11, 9, 12, 13],
      [14, 17, 21, 19, 24, 24],
      [21, 27, 45, 39, 50, 50],
      [54, 60, 67, 50, 73, 80],
      [62, 68, 75, 70, 85, 115],
      [75, 82, 89, 75, 103, 120],
      [87, 96, 105, 90, 120, 145],
      [98, 105, 120, 100, 140, 160],
      [108, 117, 131, 113, 153, 181],
      [117, 127, 139, 125, 170, 200],
    ]);
    // The column «Максимум в одному підході» of the stages.
    expect(wolves?.stages.map(({ levels }) => Math.max(...levels.flatMap(({ sets }) => sets)))).toEqual([
      5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
    ]);
  });

  // The brief of «Степові вовки»: three levels of a growing load, a ladder up to the top of the
  // stage, a level whose last set is the top and a boss whose ladder with a return reaches it too.
  it('builds every stage of «Степові вовки» the same way', () => {
    for (const { levels } of wolves?.stages ?? []) {
      const top = Math.max(...levels.flatMap(({ sets }) => sets));
      const [ladder, last, boss] = levels.slice(3).map(({ sets }) => sets);

      expect(levels.map(({ type }) => type)).toEqual(['normal', 'normal', 'normal', 'ladder-up', 'normal', 'ladder-return']);
      expect(climbs(levels.slice(0, 3).map(totalReps))).toBe(true);
      expect(ladder?.at(-1)).toBe(top);
      expect(last?.at(-1)).toBe(top);
      expect(Math.max(...(boss ?? []))).toBe(top);
    }
  });

  // The most repetitions in one set of a campaign is its peak, reached only at its end.
  it('leads every campaign up to its peak', () => {
    for (const campaign of [ravens, flag, wolves]) {
      const levels = campaign?.stages.flatMap((stage) => stage.levels) ?? [];

      expect(Math.max(...levels.flatMap(({ sets }) => sets))).toBe(campaign?.peak);
      expect(Math.max(...(levels.at(-1)?.sets ?? []))).toBe(campaign?.peak);
    }
  });

  // A ladder up only climbs and a ladder down never climbs; a ladder with a return climbs to its
  // top and comes back down.
  it('builds the ladders as their types say', () => {
    const neverClimbs = (sets: readonly number[]) => sets.every((reps, index) => index === 0 || reps <= (sets[index - 1] ?? reps));

    for (const { type, sets } of allLevels(SICH)) {
      const top = sets.indexOf(Math.max(...sets));

      if (type === 'ladder-up') {
        expect(climbs(sets)).toBe(true);
      }
      if (type === 'ladder-down') {
        expect(neverClimbs(sets)).toBe(true);
      }
      if (type === 'ladder-return') {
        expect(climbs(sets.slice(0, top + 1)) && climbs(sets.slice(top).reverse())).toBe(true);
        expect(top > 0 && top < sets.length - 1).toBe(true);
      }
    }
  });

  // «Лісові круки» climbs every ladder from one and comes back down to one.
  it('starts the ladders of «Лісові круки» from one', () => {
    for (const { type, sets } of ravens?.stages.flatMap(({ levels }) => levels) ?? []) {
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
    expect(findLevel(SICH, 'black-flag/10/6')).toMatchObject({ boss: true, type: 'ladder-return', sets: [5, 10, 15, 25, 15, 10, 5] });
    expect(findLevel(SICH, 'steppe-wolves/1/1')).toEqual({
      id: 'steppe-wolves/1/1',
      campaign: 'steppe-wolves',
      stage: 1,
      number: 1,
      type: 'normal',
      boss: false,
      sets: [2, 3, 3],
    });
    expect(findLevel(SICH, 'steppe-wolves/10/6')).toMatchObject({
      boss: true,
      type: 'ladder-return',
      sets: [15, 25, 35, 50, 35, 25, 15],
    });
    expect(new Set(allLevels(SICH).map(({ id }) => id)).size).toBe(181);
  });

  it('finds nothing that does not exist', () => {
    expect(findCampaign(SICH, 'white-swans')).toBeNull();
    expect(findLevel(SICH, 'forest-ravens/1/5')).toBeNull();
    expect(findLevel(SICH, 'black-flag/1/7')).toBeNull();
    expect(findLevel(SICH, 'steppe-wolves/11/1')).toBeNull();
    expect(findStage(ravens ?? (undefined as never), 11)).toBeNull();
    expect(findStage(ravens ?? (undefined as never), 3)?.levels).toHaveLength(7);
  });
});
