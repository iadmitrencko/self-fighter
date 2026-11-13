import { describe, expect, it } from 'vitest';
import { DUEL, roundSets } from './duel';
import { awardFor, duelAward, FIGHT_GLORY, gloryOf } from './glory';
import { allLevels, SICH, type JourneyDefinition } from './journey';
import { EMPTY_RECORD, type GameRecord } from './record';

const levelsOf = (campaign: string) =>
  allLevels(SICH)
    .filter((level) => level.campaign === campaign)
    .map(({ id }) => id);
const RAVENS = levelsOf('forest-ravens');
const FLAG = levelsOf('black-flag');
const WOLVES = levelsOf('steppe-wolves');

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

  // 50 levels and 10 bosses, and +10 for the campaign: «Чорний прапор» and «Степові вовки» bring
  // 160 each. The final battle is still being prepared, so the three campaigns end no journey.
  it('counts every campaign apart', () => {
    expect(gloryOf(SICH, record(0, FLAG.slice(0, -1)))).toBe(145);
    expect(gloryOf(SICH, record(0, FLAG))).toBe(160);
    expect(gloryOf(SICH, record(0, WOLVES))).toBe(160);
    expect(gloryOf(SICH, record(0, [...FLAG, ...RAVENS]))).toBe(322);
    expect(gloryOf(SICH, record(0, [...FLAG, ...WOLVES, ...RAVENS]))).toBe(482);
  });

  // §24.9: +5 for every round of the duel finished, +30 for the King defeated.
  it('comes with the rounds of the duel and the victory over the King', () => {
    const levels = allLevels(SICH).map(({ id }) => id);
    const done = (rounds: number) =>
      Object.fromEntries(DUEL.rounds.slice(0, rounds).map((round) => [round.id, roundSets(round).map(({ position }) => position)]));
    const glory = (rounds: number) => gloryOf(SICH, { ...record(0, levels), duel: done(rounds) });

    expect(glory(0)).toBe(482);
    expect(glory(2)).toBe(492);
    expect(glory(5)).toBe(482 + 25 + 30);
    // The duel counts once the three campaigns are passed: without the first level, nothing of it does.
    expect(gloryOf(SICH, { ...record(0, levels.slice(1)), duel: done(5) })).toBe(482 - 2 - 10);
    expect(duelAward(SICH, levels, done(4), done(5))).toEqual({ level: 5, campaign: 0, journey: 30, total: 35 });
    expect(duelAward(SICH, levels, {}, done(1))).toEqual({ level: 5, campaign: 0, journey: 0, total: 5 });
    // A battle that finishes no round brings no glory.
    expect(duelAward(SICH, levels, {}, { 'final-battle/1/1': [0] })).toEqual({ level: 0, campaign: 0, journey: 0, total: 0 });
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
      duel: null,
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
