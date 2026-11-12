import { describe, expect, it } from 'vitest';
import { awardFor, FIGHT_GLORY, gloryOf } from './glory';
import { allLevels, SICH, type JourneyDefinition } from './journey';
import { EMPTY_RECORD, type GameRecord } from './record';

const levelsOf = (campaign: string) =>
  allLevels(SICH)
    .filter((level) => level.campaign === campaign)
    .map(({ id }) => id);
const RAVENS = levelsOf('forest-ravens');
const FLAG = levelsOf('black-flag');

describe('glory', () => {
  const record = (fightWins: number, passed: readonly string[]): GameRecord => ({
    ...EMPTY_RECORD,
    fights: { wins: fightWins, draws: 3, losses: 4 },
    passed,
  });

  // §24.3: +1 for a fight won, nothing for a draw or a loss.
  it('comes with every fight won', () => {
    expect(FIGHT_GLORY).toBe(1);
    expect(gloryOf(SICH, record(7, []))).toBe(7);
  });

  // §24.3: +2 for a level, +5 for a boss.
  it('comes with every level and boss of the journey', () => {
    expect(gloryOf(SICH, record(0, RAVENS.slice(0, 3)))).toBe(6);
    expect(gloryOf(SICH, record(0, RAVENS.slice(0, 4)))).toBe(11);
  });

  // 51 levels and 10 bosses, and +10 for the campaign: «Лісові круки» bring 162.
  it('adds the campaign once its last boss is beaten', () => {
    expect(gloryOf(SICH, record(0, RAVENS.slice(0, -1)))).toBe(147);
    expect(gloryOf(SICH, record(0, RAVENS))).toBe(162);
  });

  // 50 levels and 10 bosses, and +10 for the campaign: «Чорний прапор» brings 160.
  it('counts every campaign apart', () => {
    expect(gloryOf(SICH, record(0, FLAG.slice(0, -1)))).toBe(145);
    expect(gloryOf(SICH, record(0, FLAG))).toBe(160);
    expect(gloryOf(SICH, record(0, [...FLAG, ...RAVENS]))).toBe(322);
  });

  it('ignores levels the journey does not have', () => {
    expect(gloryOf(SICH, record(0, ['forest-ravens/1/9', 'white-swans/1/1']))).toBe(0);
  });

  it('awards what a level adds', () => {
    expect(awardFor(SICH, [], RAVENS[0] ?? '')).toEqual({ level: 2, campaign: 0, journey: 0, total: 2 });
    expect(awardFor(SICH, RAVENS.slice(0, 3), 'forest-ravens/1/4')).toEqual({ level: 5, campaign: 0, journey: 0, total: 5 });
    expect(awardFor(SICH, RAVENS.slice(0, -1), 'forest-ravens/10/7')).toEqual({ level: 5, campaign: 10, journey: 0, total: 15 });
    // The award of a level stays the same once the level is among the passed ones.
    expect(awardFor(SICH, RAVENS, 'forest-ravens/10/7')).toEqual({ level: 5, campaign: 10, journey: 0, total: 15 });
  });

  // §24.3: +30 for the final battle, which ends the journey.
  it('adds the journey with the final battle', () => {
    const level = (campaign: string, boss: boolean) => ({
      id: `${campaign}/1/1`,
      campaign: campaign as 'black-flag',
      stage: 1,
      number: 1,
      type: 'normal' as const,
      boss,
      sets: [1],
    });
    const campaign = (id: string, final = false) => ({
      id: id as 'black-flag',
      exercise: 'push-ups',
      peak: 1,
      final,
      stages: [{ campaign: id as 'black-flag', number: 1, levels: [level(id, final)] }],
    });
    const journey: JourneyDefinition = {
      id: 'test',
      campaigns: [campaign('a'), campaign('king', true)],
      rewards: SICH.rewards,
    };

    expect(awardFor(journey, ['a/1/1'], 'king/1/1')).toEqual({ level: 5, campaign: 0, journey: 30, total: 35 });
    expect(gloryOf(journey, record(0, ['a/1/1', 'king/1/1']))).toBe(2 + 10 + 5 + 30);
  });
});
