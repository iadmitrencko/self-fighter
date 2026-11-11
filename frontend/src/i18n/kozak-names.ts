import type { CampaignId } from '../domain/kozak/journey';

// §24.5: the names of the journey alone, for the history of the site, which tells no story.

export const campaignNames: Record<CampaignId, string> = {
  'black-flag': 'Чорний прапор',
  'steppe-wolves': 'Степові вовки',
  'forest-ravens': 'Лісові круки',
  'final-battle': 'Фінальна битва',
};

const stageNames: Readonly<Record<string, string>> = {
  'forest-ravens/1': 'Перші сліди',
  'forest-ravens/2': 'Глибше в хащі',
  'forest-ravens/3': 'Серце лісу',
  'forest-ravens/4': 'Стара лісова застава',
  'forest-ravens/5': 'Кривава переправа',
  'forest-ravens/6': 'Павутина пасток',
  'forest-ravens/7': 'Отруєна стежка',
  'forest-ravens/8': 'Чорне лігво',
  'forest-ravens/9': 'Вороняча вежа',
  'forest-ravens/10': 'Гніздо Чорного Крука',
};

const levelNames: Readonly<Record<string, string>> = {
  'forest-ravens/1/1': 'Перше випробування',
  'forest-ravens/1/2': 'Лісова варта',
  'forest-ravens/1/3': 'Слід розбійників',
  'forest-ravens/1/4': 'Ватажок розвідників',
  'forest-ravens/2/1': 'Сліди воронів',
  'forest-ravens/2/2': 'Темні хащі',
  'forest-ravens/2/3': 'Гніздо розвідників',
  'forest-ravens/2/4': 'Поклик зграї',
  'forest-ravens/2/5': 'Вороняче гніздо',
  'forest-ravens/2/6': 'Останній дозор',
  'forest-ravens/2/7': 'Володар круків',
  'forest-ravens/3/1': 'За покликом круків',
  'forest-ravens/3/2': 'Чорні пера',
  'forest-ravens/3/3': 'Глуха стежка',
  'forest-ravens/3/4': 'Знак на дереві',
  'forest-ravens/3/5': 'Вартові хащів',
  'forest-ravens/3/6': 'Чорна галявина',
  'forest-ravens/3/7': 'Сірий Крук',
  'forest-ravens/4/1': 'Кам’яна стежка',
  'forest-ravens/4/2': 'Зруйнована брама',
  'forest-ravens/4/3': 'Сторожа застави',
  'forest-ravens/4/4': 'Тиха варта',
  'forest-ravens/4/5': 'Перший пролом',
  'forest-ravens/4/6': 'Кам’яний Сторож',
  'forest-ravens/5/1': 'Стара переправа',
  'forest-ravens/5/2': 'Розвідка берега',
  'forest-ravens/5/3': 'Сліди на березі',
  'forest-ravens/5/4': 'Переправа під вогнем',
  'forest-ravens/5/5': 'Кривавий брід',
  'forest-ravens/5/6': 'Переправник',
  'forest-ravens/6/1': 'Небезпечна стежка',
  'forest-ravens/6/2': 'Прихована яма',
  'forest-ravens/6/3': 'Лісові тенета',
  'forest-ravens/6/4': 'Розтяжки в хащах',
  'forest-ravens/6/5': 'Полювання на чужинця',
  'forest-ravens/6/6': 'Ловець',
  'forest-ravens/7/1': 'Отруйні сліди',
  'forest-ravens/7/2': 'Збір гірких трав',
  'forest-ravens/7/3': 'Чорне зілля',
  'forest-ravens/7/4': 'Отруєні стріли',
  'forest-ravens/7/5': 'Майстерня травника',
  'forest-ravens/7/6': 'Чорний Травник',
  'forest-ravens/8/1': 'Таємний підхід',
  'forest-ravens/8/2': 'Зовнішня варта',
  'forest-ravens/8/3': 'Сховище здобичі',
  'forest-ravens/8/4': 'Табір розбійників',
  'forest-ravens/8/5': 'Внутрішнє лігво',
  'forest-ravens/8/6': 'Старший Отаман',
  'forest-ravens/9/1': 'Вороняча стежка',
  'forest-ravens/9/2': 'Дозорні пости',
  'forest-ravens/9/3': 'Стрілецька позиція',
  'forest-ravens/9/4': 'Підніжжя вежі',
  'forest-ravens/9/5': 'Сходи ворона',
  'forest-ravens/9/6': 'Правиця Чорного Крука',
  'forest-ravens/10/1': 'Остання стежа',
  'forest-ravens/10/2': 'Варта Чорного Крука',
  'forest-ravens/10/3': 'Чорні лучники',
  'forest-ravens/10/4': 'Кривава зала',
  'forest-ravens/10/5': 'Скарбниця круків',
  'forest-ravens/10/6': 'Перед лігвом ватажка',
  'forest-ravens/10/7': 'Чорний Крук',
};

export function campaignName(id: string): string | null {
  return Object.hasOwn(campaignNames, id) ? campaignNames[id as CampaignId] : null;
}

export function stageName(campaign: string, stage: number): string {
  return stageNames[`${campaign}/${stage}`] ?? `Етап ${stage}`;
}

export function levelName(id: string): string {
  return levelNames[id] ?? id;
}

// The history of the site names a level of the journey by its campaign, stage and level.
export const journeyHistoryTexts = {
  journey: 'Похід',
  level: (campaign: string, stage: number, level: string, done: number, total: number) =>
    `${campaign} · етап ${stage} · «${level}» · ${done} з ${total} підходів`,
  openInGame: 'Відкрити в грі',
};
