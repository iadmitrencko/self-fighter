import type { CampaignDefinition, JourneyDefinition, LevelDefinition, StageDefinition } from './journey';

// done: passed; current: the next to take; locked: waits for the one before it (§24.5).
export type Status = 'done' | 'current' | 'locked';

// open: the campaign can be played; locked: it waits for other campaigns or is still being prepared.
export type CampaignStatus = 'done' | 'open' | 'locked';

export interface LevelProgress {
  readonly level: LevelDefinition;
  readonly status: Status;
}

export interface StageProgress {
  readonly stage: StageDefinition;
  readonly status: Status;
  readonly levels: readonly LevelProgress[];
  // Levels passed.
  readonly passed: number;
}

export interface CampaignProgress {
  readonly campaign: CampaignDefinition;
  readonly status: CampaignStatus;
  readonly stages: readonly StageProgress[];
  // Stages passed.
  readonly passed: number;
}

export interface JourneyProgress {
  readonly campaigns: readonly CampaignProgress[];
  // The final battle is won.
  readonly done: boolean;
}

/**
 * Levels open one after another: the first level of a stage opens with the stage, the next one
 * with the level before it, and a stage opens once the stage before it is passed. A level passed
 * stays passed, so the order of the history does not matter.
 */
export function journeyProgress(journey: JourneyDefinition, passed: readonly string[]): JourneyProgress {
  const won = new Set(passed);
  const regular = journey.campaigns
    .filter(({ final }) => !final)
    .map((campaign) => campaignProgress(campaign, campaign.stages.length > 0, won));
  const allPassed = regular.every(({ status }) => status === 'done');
  const campaigns = journey.campaigns.map(
    (campaign) =>
      regular.find((progress) => progress.campaign === campaign) ??
      campaignProgress(campaign, allPassed && campaign.stages.length > 0, won),
  );

  return { campaigns, done: campaigns.some(({ campaign, status }) => campaign.final && status === 'done') };
}

function campaignProgress(campaign: CampaignDefinition, open: boolean, won: ReadonlySet<string>): CampaignProgress {
  let previousDone = open;
  const stages = campaign.stages.map((stage) => {
    const progress = stageProgress(stage, previousDone, won);
    previousDone = progress.status === 'done';

    return progress;
  });
  const passed = stages.filter(({ status }) => status === 'done').length;
  const status: CampaignStatus = !open ? 'locked' : passed === stages.length ? 'done' : 'open';

  return { campaign, status, stages, passed };
}

function stageProgress(stage: StageDefinition, open: boolean, won: ReadonlySet<string>): StageProgress {
  let previousDone = true;
  const levels = stage.levels.map((level) => {
    const done = won.has(level.id);
    const status: Status = open && done ? 'done' : open && previousDone ? 'current' : 'locked';
    previousDone = done;

    return { level, status };
  });
  const passed = levels.filter(({ status }) => status === 'done').length;
  const status: Status = !open ? 'locked' : passed === levels.length ? 'done' : 'current';

  return { stage, status, levels, passed };
}

// The next level to take in a campaign, or null when it is passed or locked.
export function currentLevel(campaign: CampaignProgress): LevelProgress | null {
  return (
    campaign.stages.flatMap(({ levels }) => levels).find(({ status }) => status === 'current') ?? null
  );
}

// The stage to show first: the one in progress, the last one of a passed campaign, the first one
// of a locked campaign.
export function currentStage(campaign: CampaignProgress): StageProgress | null {
  return (
    campaign.stages.find(({ status }) => status === 'current') ??
    (campaign.status === 'done' ? campaign.stages.at(-1) : campaign.stages[0]) ??
    null
  );
}

export function levelProgress(journey: JourneyProgress, id: string): LevelProgress | null {
  return (
    journey.campaigns
      .flatMap(({ stages }) => stages.flatMap(({ levels }) => levels))
      .find(({ level }) => level.id === id) ?? null
  );
}

export function campaignOf(journey: JourneyProgress, id: string): CampaignProgress | null {
  return journey.campaigns.find(({ campaign }) => campaign.id === id) ?? null;
}
