import { describe, expect, it } from 'vitest';
import { allLevels, SICH, type JourneyDefinition } from './journey';
import { campaignOf, currentLevel, currentStage, journeyProgress, levelProgress } from './progress';

const RAVENS = 'forest-ravens';
// Every level of «Лісові круки» up to and including the given one.
const upTo = (id: string) => {
  const levels = allLevels(SICH)
    .filter(({ campaign }) => campaign === RAVENS)
    .map((level) => level.id);

  return levels.slice(0, levels.indexOf(id) + 1);
};
const ravensOf = (passed: readonly string[]) => campaignOf(journeyProgress(SICH, passed), RAVENS);

describe('the progress of the journey', () => {
  // §24.5: «Чорний прапор» and «Лісові круки» can be played; «Степові вовки» is still being prepared.
  it('opens the campaigns that have their levels', () => {
    const journey = journeyProgress(SICH, []);

    expect(journey.campaigns.map(({ campaign, status }) => [campaign.id, status])).toEqual([
      ['black-flag', 'open'],
      ['steppe-wolves', 'locked'],
      ['forest-ravens', 'open'],
      ['final-battle', 'locked'],
    ]);
    expect(journey.done).toBe(false);
  });

  it('starts at the first level of the first stage', () => {
    const ravens = ravensOf([]);

    expect(ravens?.passed).toBe(0);
    expect(ravens?.stages.map(({ status }) => status)).toEqual(['current', ...Array<string>(9).fill('locked')]);
    expect(ravens?.stages[0]?.levels.map(({ status }) => status)).toEqual(['current', 'locked', 'locked', 'locked']);
    expect(currentLevel(ravens ?? (undefined as never))?.level.id).toBe('forest-ravens/1/1');
    expect(currentStage(ravens ?? (undefined as never))?.stage.number).toBe(1);
  });

  it('opens the next level after the one passed', () => {
    const stage = ravensOf(upTo('forest-ravens/1/2'))?.stages[0];

    expect(stage?.levels.map(({ status }) => status)).toEqual(['done', 'done', 'current', 'locked']);
    expect(stage?.passed).toBe(2);
    expect(stage?.status).toBe('current');
  });

  // The boss closes the stage and opens the next one.
  it('opens the next stage after the boss', () => {
    const ravens = ravensOf(upTo('forest-ravens/1/4'));

    expect(ravens?.stages.slice(0, 3).map(({ status }) => status)).toEqual(['done', 'current', 'locked']);
    expect(ravens?.passed).toBe(1);
    expect(currentLevel(ravens ?? (undefined as never))?.level.id).toBe('forest-ravens/2/1');
  });

  it('passes the campaign with its last boss', () => {
    const journey = journeyProgress(SICH, upTo('forest-ravens/10/7'));
    const ravens = campaignOf(journey, RAVENS);

    expect(ravens?.status).toBe('done');
    expect(ravens?.passed).toBe(10);
    expect(currentLevel(ravens ?? (undefined as never))).toBeNull();
    expect(currentStage(ravens ?? (undefined as never))?.stage.number).toBe(10);
    // The other campaigns are still being prepared, so the final battle waits.
    expect(campaignOf(journey, 'final-battle')?.status).toBe('locked');
  });

  // A level opens with the one before it, and a stage with the stage before it, whatever else the
  // history holds: the player still starts from the first level that is not passed.
  it('keeps the order of the levels whatever the history says', () => {
    const ravens = ravensOf(['forest-ravens/1/3', 'forest-ravens/2/1']);

    expect(ravens?.stages[0]?.levels.map(({ status }) => status)).toEqual(['current', 'locked', 'done', 'current']);
    expect(ravens?.stages[1]?.levels[0]?.status).toBe('locked');
    expect(currentLevel(ravens ?? (undefined as never))?.level.id).toBe('forest-ravens/1/1');
  });

  it('finds a level and a campaign by id', () => {
    const journey = journeyProgress(SICH, upTo('forest-ravens/1/1'));

    expect(levelProgress(journey, 'forest-ravens/1/1')?.status).toBe('done');
    expect(levelProgress(journey, 'forest-ravens/1/2')?.status).toBe('current');
    expect(levelProgress(journey, 'forest-ravens/1/9')).toBeNull();
    expect(campaignOf(journey, 'white-swans')).toBeNull();
  });

  it('shows the first stage of a locked campaign', () => {
    const journey = journeyProgress(SICH, []);
    const locked = { ...(ravensOf([]) ?? (undefined as never)), status: 'locked' as const };

    expect(currentStage(locked)?.stage.number).toBe(1);
    expect(currentStage(campaignOf(journey, 'steppe-wolves') ?? (undefined as never))).toBeNull();
  });

  // §24.5: the final battle opens once every other campaign is passed, and its win ends the journey.
  it('opens the final battle after the other campaigns', () => {
    const level = (campaign: string) => ({
      id: `${campaign}/1/1`,
      campaign: campaign as 'black-flag',
      stage: 1,
      number: 1,
      type: 'normal' as const,
      boss: true,
      sets: [1],
    });
    const campaign = (id: string, final = false) => ({
      id: id as 'black-flag',
      exercise: 'push-ups',
      peak: 1,
      final,
      stages: [{ campaign: id as 'black-flag', number: 1, levels: [level(id)] }],
    });
    const journey: JourneyDefinition = {
      id: 'test',
      campaigns: [campaign('a'), campaign('b'), campaign('king', true)],
      rewards: SICH.rewards,
    };

    expect(campaignOf(journeyProgress(journey, ['a/1/1']), 'king')?.status).toBe('locked');
    expect(campaignOf(journeyProgress(journey, ['a/1/1', 'b/1/1']), 'king')?.status).toBe('open');
    expect(journeyProgress(journey, ['a/1/1', 'b/1/1']).done).toBe(false);
    expect(journeyProgress(journey, ['a/1/1', 'b/1/1', 'king/1/1']).done).toBe(true);
  });
});
