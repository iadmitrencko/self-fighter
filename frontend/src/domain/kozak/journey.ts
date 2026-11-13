import { DUEL, type DuelDefinition } from './duel';

/**
 * §24.5: the journey «Січ». Three campaigns against the bands of robbers and the final battle
 * with their king (§24.9). The structure and the sets of every level are rules of the game; the
 * names and the story live in src/i18n.
 */

export type CampaignId = 'black-flag' | 'steppe-wolves' | 'forest-ravens' | 'final-battle';

// How the sets of a level go: as written, up to the top, down from it, or up and back down.
export type LevelType = 'normal' | 'ladder-up' | 'ladder-down' | 'ladder-return';

export interface LevelDefinition {
  // campaign/stage/level, such as forest-ravens/1/4. Attempts keep it, so it never changes.
  readonly id: string;
  readonly campaign: CampaignId;
  readonly stage: number;
  readonly number: number;
  readonly type: LevelType;
  // The last level of a stage: its leader.
  readonly boss: boolean;
  // Repetitions of each set, in order.
  readonly sets: readonly number[];
}

export interface StageDefinition {
  readonly campaign: CampaignId;
  readonly number: number;
  readonly levels: readonly LevelDefinition[];
}

export interface CampaignDefinition {
  readonly id: CampaignId;
  // A ready-made exercise (§5.1), or null while the campaign is still being prepared.
  readonly exercise: string | null;
  // The most repetitions in one set the campaign leads to.
  readonly peak: number | null;
  // Empty while the campaign is still being prepared, and for the final battle, which is a duel.
  readonly stages: readonly StageDefinition[];
  // The final battle opens once every other campaign of the journey is passed.
  readonly final: boolean;
  // §24.9: the duel with the King of robbers the final battle is, or null.
  readonly duel: DuelDefinition | null;
}

// The glory the journey gives. The next journey may give other amounts (§24.3).
export interface JourneyRewards {
  readonly level: number;
  readonly boss: number;
  // For a campaign passed, on top of its levels.
  readonly campaign: number;
  // For every round of the duel with the King finished (§24.9).
  readonly round: number;
  // For the final battle won: the journey is passed.
  readonly journey: number;
}

export interface JourneyDefinition {
  readonly id: string;
  readonly campaigns: readonly CampaignDefinition[];
  readonly rewards: JourneyRewards;
}

// A level as the brief of the journey writes it: its type, its sets and whether it is the boss.
type LevelSpec = readonly [type: LevelType, scheme: string, boss?: 'boss'];

// §24.5, «Лісові круки»: pull-ups, ten stages, 61 levels.
const FOREST_RAVENS: readonly (readonly LevelSpec[])[] = [
  // 1. Перші сліди
  [['normal', '1-1-1'], ['normal', '1-1-1-1'], ['normal', '1-1-1-1-1'], ['normal', '1-1-1-1-1-1-1-1-1-1', 'boss']],
  // 2. Глибше в хащі
  [
    ['normal', '2-1-1'],
    ['normal', '2-2-1'],
    ['ladder-up', '1-2-3'],
    ['normal', '2-2-2-1'],
    ['normal', '2-2-2-2'],
    ['ladder-down', '3-2-2-1'],
    ['normal', '2-2-2-2-2-2-2-2-2-2', 'boss'],
  ],
  // 3. Серце лісу
  [
    ['normal', '3-2-2-1'],
    ['normal', '3-2-2-2'],
    ['normal', '3-3-2-2'],
    ['ladder-up', '1-2-3-4'],
    ['normal', '3-3-3-2'],
    ['normal', '3-3-3-3'],
    ['normal', '3-3-3-3-3-3-3-3-3-3', 'boss'],
  ],
  // 4. Стара лісова застава
  [
    ['normal', '4-3-3-3'],
    ['ladder-up', '1-2-3-4'],
    ['normal', '4-4-3-3-3'],
    ['ladder-down', '4-3-2-1'],
    ['normal', '4-4-4-3-3'],
    ['ladder-return', '1-2-3-4-3-2-1', 'boss'],
  ],
  // 5. Кривава переправа
  [
    ['normal', '5-4-4-4'],
    ['ladder-up', '1-2-3-4-5'],
    ['normal', '5-5-4-4'],
    ['normal', '5-5-5-4'],
    ['ladder-down', '5-4-3-2-1'],
    ['ladder-return', '1-2-3-4-5-4-3-2-1', 'boss'],
  ],
  // 6. Павутина пасток
  [
    ['normal', '6-5-5-5'],
    ['ladder-up', '1-2-3-4-5-6'],
    ['normal', '6-6-5-5'],
    ['normal', '6-6-6-5'],
    ['normal', '6-5-6-5'],
    ['ladder-return', '1-2-3-4-5-6-5-4-3-2-1', 'boss'],
  ],
  // 7. Отруєна стежка
  [
    ['normal', '7-6-6-6'],
    ['ladder-up', '1-2-3-4-5-6-7'],
    ['normal', '7-7-6-6'],
    ['normal', '7-7-7-6'],
    ['normal', '7-6-7-6'],
    ['ladder-return', '1-2-3-4-5-6-7-6-5-4-3-2-1', 'boss'],
  ],
  // 8. Чорне лігво
  [
    ['normal', '8-7-7-7'],
    ['ladder-up', '1-2-3-4-5-6-7-8'],
    ['normal', '8-8-7-7'],
    ['normal', '8-8-8-7'],
    ['normal', '8-7-8-7'],
    ['ladder-return', '1-2-3-4-5-6-7-8-7-6-5-4-3-2-1', 'boss'],
  ],
  // 9. Вороняча вежа
  [
    ['normal', '9-8-8-8'],
    ['ladder-up', '1-2-3-4-5-6-7-8-9'],
    ['normal', '9-9-8-8'],
    ['normal', '9-9-9-8'],
    ['normal', '9-8-9-8'],
    ['ladder-return', '1-2-3-4-5-6-7-8-9-8-7-6-5-4-3-2-1', 'boss'],
  ],
  // 10. Гніздо Чорного Крука
  [
    ['normal', '10-9-9-9'],
    ['ladder-up', '1-2-3-4-5-6-7-8-9-10'],
    ['normal', '10-10-9-9'],
    ['normal', '10-10-10-9'],
    ['normal', '10-9-10-9'],
    ['normal', '10-10-10-10'],
    ['ladder-return', '1-2-3-4-5-6-7-8-9-10-9-8-7-6-5-4-3-2-1', 'boss'],
  ],
];

// §24.5, «Чорний прапор»: push-ups, ten stages of six levels, up to 25 in one set.
const BLACK_FLAG: readonly (readonly LevelSpec[])[] = [
  // 1. Перші напади
  [
    ['normal', '1-1-2'],
    ['normal', '1-2-2'],
    ['normal', '2-2-2'],
    ['ladder-up', '1-2-3'],
    ['normal', '2-3-2'],
    ['ladder-return', '1-2-3-2-1', 'boss'],
  ],
  // 2. Розбійницькі ватаги
  [
    ['normal', '3-2-2'],
    ['normal', '3-3-2'],
    ['ladder-up', '2-3-4-5'],
    ['normal', '4-3-3'],
    ['normal', '4-5-3'],
    ['ladder-return', '1-3-5-3-1', 'boss'],
  ],
  // 3. Чорні здирники
  [
    ['normal', '5-4-4'],
    ['normal', '5-5-4-3'],
    ['normal', '6-5-5'],
    ['ladder-up', '3-5-6-8'],
    ['normal', '7-6-5-4'],
    ['ladder-return', '2-4-6-8-6-4', 'boss'],
  ],
  // 4. Залізний заслін
  [
    ['normal', '7-6-5-4'],
    ['normal', '7-7-6-5'],
    ['normal', '8-7-6-5'],
    ['ladder-up', '4-6-8-11'],
    ['normal', '9-8-7-6'],
    ['ladder-return', '2-4-7-11-7-4-2', 'boss'],
  ],
  // 5. Табір Чорного прапора
  [
    ['normal', '9-8-7-6'],
    ['normal', '9-9-8-7'],
    ['normal', '10-9-8-7'],
    ['ladder-up', '5-8-11-14'],
    ['normal', '11-10-9-8'],
    ['ladder-return', '3-6-9-14-9-6-3', 'boss'],
  ],
  // 6. Кривава дорога
  [
    ['normal', '11-10-9-8'],
    ['normal', '11-11-10-9'],
    ['normal', '12-11-10-9'],
    ['ladder-up', '5-9-13-17'],
    ['normal', '13-12-11-10'],
    ['ladder-return', '3-6-10-17-10-6-3', 'boss'],
  ],
  // 7. Чорні головорізи
  [
    ['normal', '12-11-10-9'],
    ['normal', '12-12-11-10'],
    ['ladder-up', '5-9-14-19'],
    ['normal', '14-13-12-10'],
    ['normal', '15-14-12-10'],
    ['ladder-return', '4-8-12-19-12-8-4', 'boss'],
  ],
  // 8. Велика ватага
  [
    ['normal', '14-13-12-10'],
    ['normal', '14-14-13-11'],
    ['ladder-up', '5-10-15-21'],
    ['normal', '16-15-14-12'],
    ['normal', '17-16-15-12'],
    ['ladder-return', '4-8-13-21-13-8-4', 'boss'],
  ],
  // 9. Останній рубіж
  [
    ['normal', '15-14-13-11'],
    ['normal', '16-15-14-12'],
    ['ladder-up', '5-10-16-23'],
    ['normal', '17-16-15-13'],
    ['normal', '18-17-16-14'],
    ['ladder-return', '5-10-15-23-15-10-5', 'boss'],
  ],
  // 10. Король розбійників
  [
    ['normal', '16-15-14-12'],
    ['normal', '17-16-15-13'],
    ['ladder-up', '5-11-18-25'],
    ['normal', '18-17-16-14'],
    ['normal', '20-18-17-15'],
    ['ladder-return', '5-10-15-25-15-10-5', 'boss'],
  ],
];

/*
 * §24.5, «Степові вовки»: squats, ten stages of six levels, up to 50 in one set. Every stage
 * raises the load over its first three levels and reaches its top three times: in the ladder up
 * of its fourth level, in the last set of its fifth and in the ladder of its boss.
 */
const STEPPE_WOLVES: readonly (readonly LevelSpec[])[] = [
  // 1. Перші сліди
  [
    ['normal', '2-3-3'],
    ['normal', '3-3-4'],
    ['normal', '3-4-4'],
    ['ladder-up', '1-3-5'],
    ['normal', '3-4-5'],
    ['ladder-return', '1-3-5-3-1', 'boss'],
  ],
  // 2. Степові нальоти
  [
    ['normal', '4-5-5'],
    ['normal', '5-6-6'],
    ['normal', '6-7-8'],
    ['ladder-up', '3-6-10'],
    ['normal', '6-8-10'],
    ['ladder-return', '2-5-10-5-2', 'boss'],
  ],
  // 3. Вовчі вершники
  [
    ['normal', '6-7-8'],
    ['normal', '8-9-10'],
    ['normal', '9-11-12-13'],
    ['ladder-up', '4-8-12-15'],
    ['normal', '10-12-13-15'],
    ['ladder-return', '3-6-10-15-10-6', 'boss'],
  ],
  // 4. Кривавий тракт
  [
    ['normal', '10-13-15-16'],
    ['normal', '12-14-16-18'],
    ['normal', '14-16-18-19'],
    ['ladder-up', '5-10-15-20'],
    ['normal', '16-18-19-20'],
    ['ladder-return', '5-10-15-20-15-10-5', 'boss'],
  ],
  // 5. Арбалетна засідка
  [
    ['normal', '12-15-17-18'],
    ['normal', '14-16-18-20'],
    ['normal', '15-18-20-22'],
    ['ladder-up', '10-15-20-25'],
    ['normal', '18-20-22-25'],
    ['ladder-return', '10-15-20-25-20-15-10', 'boss'],
  ],
  // 6. Вовче лігво
  [
    ['normal', '15-18-20-22'],
    ['normal', '17-19-22-24'],
    ['normal', '18-21-24-26'],
    ['ladder-up', '8-15-22-30'],
    ['normal', '22-24-27-30'],
    ['ladder-return', '8-15-22-30-22-15-8', 'boss'],
  ],
  // 7. Степові рубаки
  [
    ['normal', '18-21-23-25'],
    ['normal', '20-23-25-28'],
    ['normal', '22-25-28-30'],
    ['ladder-up', '10-18-27-35'],
    ['normal', '25-28-32-35'],
    ['ladder-return', '10-18-27-35-27-18-10', 'boss'],
  ],
  // 8. Великий загін
  [
    ['normal', '20-24-26-28'],
    ['normal', '22-25-28-30'],
    ['normal', '25-28-32-35'],
    ['ladder-up', '10-20-30-40'],
    ['normal', '30-33-37-40'],
    ['ladder-return', '10-20-30-40-30-20-10', 'boss'],
  ],
  // 9. Останнє полювання
  [
    ['normal', '22-26-29-31'],
    ['normal', '24-28-31-34'],
    ['normal', '27-31-35-38'],
    ['ladder-up', '12-22-34-45'],
    ['normal', '32-36-40-45'],
    ['ladder-return', '12-22-34-45-34-22-12', 'boss'],
  ],
  // 10. Сірий Вовк
  [
    ['normal', '24-28-31-34'],
    ['normal', '26-30-34-37'],
    ['normal', '29-33-37-40'],
    ['ladder-up', '12-25-38-50'],
    ['normal', '35-40-45-50'],
    ['ladder-return', '15-25-35-50-35-25-15', 'boss'],
  ],
];

function campaign(
  id: CampaignId,
  exercise: string,
  peak: number,
  stages: readonly (readonly LevelSpec[])[],
): CampaignDefinition {
  return {
    id,
    exercise,
    peak,
    final: false,
    duel: null,
    stages: stages.map((levels, stageIndex) => ({
      campaign: id,
      number: stageIndex + 1,
      levels: levels.map(([type, scheme, boss], levelIndex) => ({
        id: `${id}/${stageIndex + 1}/${levelIndex + 1}`,
        campaign: id,
        stage: stageIndex + 1,
        number: levelIndex + 1,
        type,
        boss: boss === 'boss',
        sets: scheme.split('-').map(Number),
      })),
    })),
  };
}

export const SICH: JourneyDefinition = {
  id: 'sich',
  // In the order of the story. The final battle is a duel with the King of all three exercises.
  campaigns: [
    campaign('black-flag', 'push-ups', 25, BLACK_FLAG),
    campaign('steppe-wolves', 'squats', 50, STEPPE_WOLVES),
    campaign('forest-ravens', 'pull-ups', 10, FOREST_RAVENS),
    { id: 'final-battle', exercise: null, peak: null, stages: [], final: true, duel: DUEL },
  ],
  rewards: { level: 2, boss: 5, campaign: 10, round: 5, journey: 30 },
};

export function findCampaign(journey: JourneyDefinition, id: string): CampaignDefinition | null {
  return journey.campaigns.find((item) => item.id === id) ?? null;
}

export function findStage(campaign: CampaignDefinition, number: number): StageDefinition | null {
  return campaign.stages.find((stage) => stage.number === number) ?? null;
}

export function findLevel(journey: JourneyDefinition, id: string): LevelDefinition | null {
  return allLevels(journey).find((level) => level.id === id) ?? null;
}

export function allLevels(journey: JourneyDefinition): LevelDefinition[] {
  return journey.campaigns.flatMap(({ stages }) => stages.flatMap(({ levels }) => levels));
}

export function totalReps({ sets }: { readonly sets: readonly number[] }): number {
  return sets.reduce((total, reps) => total + reps, 0);
}
