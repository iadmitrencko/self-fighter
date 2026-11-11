import { allLevels, type JourneyDefinition } from './journey';
import { journeyProgress } from './progress';
import type { GameRecord } from './record';

// §24.3: a fight of the game won.
export const FIGHT_GLORY = 1;

// The glory a journey brings for its levels, campaigns and the final battle.
export interface Award {
  readonly level: number;
  readonly campaign: number;
  readonly journey: number;
  readonly total: number;
}

function journeyGlory(journey: JourneyDefinition, passed: readonly string[]): Award {
  const won = new Set(passed);
  const { rewards } = journey;
  const level = allLevels(journey)
    .filter(({ id }) => won.has(id))
    .reduce((total, { boss }) => total + (boss ? rewards.boss : rewards.level), 0);
  const done = journeyProgress(journey, passed).campaigns.filter(({ status }) => status === 'done');
  const campaign = done.filter(({ campaign }) => !campaign.final).length * rewards.campaign;
  const final = done.some(({ campaign }) => campaign.final) ? rewards.journey : 0;

  return { level, campaign, journey: final, total: level + campaign + final };
}

export function gloryOf(journey: JourneyDefinition, record: GameRecord): number {
  return record.fights.wins * FIGHT_GLORY + journeyGlory(journey, record.passed).total;
}

// What a level adds to the glory when it is passed: itself, and the campaign or the journey it ends.
export function awardFor(journey: JourneyDefinition, passed: readonly string[], level: string): Award {
  const before = journeyGlory(journey, passed.filter((id) => id !== level));
  const after = journeyGlory(journey, [...passed, level]);

  return {
    level: after.level - before.level,
    campaign: after.campaign - before.campaign,
    journey: after.journey - before.journey,
    total: after.total - before.total,
  };
}
