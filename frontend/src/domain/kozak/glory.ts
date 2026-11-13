import type { DuelDone } from './duel';
import { allLevels, type JourneyDefinition } from './journey';
import { journeyProgress } from './progress';
import type { GameRecord } from './record';

// §24.3: a fight of the game won.
export const FIGHT_GLORY = 1;

// The glory a journey brings for its levels, campaigns, the rounds of the duel and the final battle.
export interface Award {
  readonly level: number;
  readonly campaign: number;
  readonly journey: number;
  readonly total: number;
}

function journeyGlory(journey: JourneyDefinition, passed: readonly string[], duel: DuelDone): Award {
  const won = new Set(passed);
  const { rewards } = journey;
  const progress = journeyProgress(journey, passed, duel);
  // §24.9: a round of the duel counts as a level of the final battle.
  const rounds = progress.campaigns.flatMap(({ duel: rounds }) => rounds?.rounds ?? []).filter(({ status }) => status === 'done');
  const level =
    allLevels(journey)
      .filter(({ id }) => won.has(id))
      .reduce((total, { boss }) => total + (boss ? rewards.boss : rewards.level), 0) +
    rounds.length * rewards.round;
  const done = progress.campaigns.filter(({ status }) => status === 'done');
  const campaign = done.filter(({ campaign }) => !campaign.final).length * rewards.campaign;
  const final = done.some(({ campaign }) => campaign.final) ? rewards.journey : 0;

  return { level, campaign, journey: final, total: level + campaign + final };
}

export function gloryOf(journey: JourneyDefinition, record: GameRecord): number {
  return record.fights.wins * FIGHT_GLORY + journeyGlory(journey, record.passed, record.duel).total;
}

// What a level adds to the glory when it is passed: itself, and the campaign or the journey it ends.
export function awardFor(journey: JourneyDefinition, passed: readonly string[], level: string): Award {
  return difference(
    journeyGlory(journey, passed.filter((id) => id !== level), {}),
    journeyGlory(journey, [...passed, level], {}),
  );
}

// §24.9: what a battle of the duel adds to the glory: the rounds it finished and the journey it ends.
export function duelAward(journey: JourneyDefinition, passed: readonly string[], before: DuelDone, after: DuelDone): Award {
  return difference(journeyGlory(journey, passed, before), journeyGlory(journey, passed, after));
}

function difference(before: Award, after: Award): Award {
  return {
    level: after.level - before.level,
    campaign: after.campaign - before.campaign,
    journey: after.journey - before.journey,
    total: after.total - before.total,
  };
}
