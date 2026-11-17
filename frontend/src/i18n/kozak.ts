import type { KingStage } from '../domain/kozak/duel';
import type { EnergyPool } from '../domain/kozak/energy';
import type { CampaignId, LevelType } from '../domain/kozak/journey';
import type { Status } from '../domain/kozak/progress';
import type { Look, RankId } from '../domain/kozak/ranks';
import { campaignNames } from './kozak-names';
import { plural } from './plural';

// §24: the texts of the cossack game. The game speaks to the player in the present tense, so
// every phrase stays the same whoever plays.

export const rankNames: Record<RankId, string> = {
  dzhura: 'Джура',
  zastavnyi: 'Заставний',
  roiovyi: 'Ройовий',
  kozak: 'Козак',
  znachkovyi: 'Значковий',
  vistun: 'Вістун',
  chotar: 'Чотар',
  pidkhorunzhyi: 'Підхорунжий',
  khorunzhyi: 'Хорунжий',
  sotnyk: 'Сотник',
  pidosavul: 'Підосавул',
  osavul: 'Осавул',
  'viiskovyi-starshyna': 'Військовий старшина',
  polkovnyk: 'Полковник',
  'heneral-osavul': 'Генерал-осавул',
  'heneral-khorunzhyi': 'Генерал-хорунжий',
  'heneral-polkovnyk': 'Генерал-полковник',
  heneral: 'Генерал',
  marshal: 'Маршал',
  hetman: 'Гетьман',
};

// §24.2: the look of the cossack grows richer with the rank, and the ranks of one look make a group.
export const lookTexts: Record<Look, { group: string; figure: string }> = {
  recruit: {
    group: 'Молодші',
    figure: 'Джура у вишиванці, синіх шароварах і з червоним поясом, із шаблею, на майдані Січі.',
  },
  cossack: {
    group: 'Козацтво',
    figure: 'Козак у шкіряній безрукавці поверх вишиванки, з червоним поясом і шаблею, на майдані Січі.',
  },
  officer: {
    group: 'Старшина',
    figure: 'Старшина в синьому жупані із золотими шнурами, з червоним поясом і шаблею, на майдані Січі.',
  },
  general: {
    group: 'Генералітет',
    figure: 'Генеральний старшина в багряному кунтуші із золотим шиттям і хутряним коміром, на майдані Січі.',
  },
  hetman: {
    group: 'Вершина',
    figure: 'Гетьман у синьому кунтуші із золотим шиттям, у хутряній шапці з пером і з булавою, на майдані Січі.',
  },
};

export const kozakTexts = {
  section: 'Розділи гри',
  nav: { cossack: 'Козак', fight: 'Бій', journey: 'Похід', ranks: 'Звання', history: 'Історія', settings: 'Налаштування', more: 'Ще' },
  loading: 'Збираємо літопис козака…',
  notFound: 'Тут нічого немає',
  notFoundText: 'Можливо, в адресі помилка. Повернись до козака або в похід.',
  toCossack: 'До козака',
};

const gloryAmount = (glory: number) => plural(glory, { one: '{n} слава', few: '{n} слави', many: '{n} слави' });
// The word after a number of glory: «2 слави».
const gloryWord = (glory: number) => plural(glory, { one: 'слава', few: 'слави', many: 'слави' });

// §24.3: what brings glory, on the page of the ranks.
export const gloryRewards = [
  ['Перемога в бою', '+1'],
  ['Рівень походу', '+2'],
  ['Бос етапу', '+5'],
  ['Кампанію пройдено', '+10'],
  ['Похід пройдено', '+30'],
] as const;

export const cossackTexts = {
  title: 'Козак',
  // Before the rank for a screen reader only: the screen shows the rank alone.
  rank: 'Звання:',
  gloryWord,
  // «★ 3 з 10 слави»: the glory out of what the next rank needs.
  of: 'з',
  // Beside the glory, the way to the page of the ranks: «наступне: Заставний».
  next: 'наступне:',
  toNext: (left: number, rank: string) => `Ще ${gloryAmount(left)} до звання «${rank}»`,
  top: 'Найвище звання здобуто',
  // §24.7: every battle of the game, a large number over its word: «24 перемоги».
  record: 'Бойовий рахунок',
  wins: (count: number) => plural(count, { one: 'перемога', few: 'перемоги', many: 'перемог' }),
  draws: (count: number) => plural(count, { one: 'нічия', few: 'нічиї', many: 'нічиїх' }),
  losses: (count: number) => plural(count, { one: 'поразка', few: 'поразки', many: 'поразок' }),
  // §24.1: «Грати» of the site leads here, and the screen leads on to the battles.
  toFight: 'До бою',
  toJourney: 'У похід',
  // §24.12: the days in a row with a battle; a run without a battle today yet asks to go on.
  streak: (days: number) => plural(days, { one: '{n} день поспіль', few: '{n} дні поспіль', many: '{n} днів поспіль' }),
  streakToday: 'продовж сьогодні',
  // §24.10: every exercise of the player, the ready-made ones and their own.
  physical: 'Фізична статистика',
  physicalExercise: 'Вправа',
  physicalBest: 'Рекорд за підхід',
  physicalWeek: 'За 7 днів',
  physicalTotal: 'Усього повторень',
  // §24.10: the repetitions of every day of the last seven, «840 повторень» over the chart.
  week: 'Останні 7 днів',
  reps: (count: number) => plural(count, { one: 'повторення', few: 'повторення', many: 'повторень' }),
  dayReps: (count: number) => plural(count, { one: '{n} повторення', few: '{n} повторення', many: '{n} повторень' }),
  weekEmpty: 'За ці дні ще жодного повторення. Бій чи рівень походу з’являться тут.',
  physicalNone: 'ще немає',
  customFailed: 'Не вдалося завантажити твої вправи, тут лише готові.',
};

export const ranksTexts = {
  title: 'Звання',
  lead: 'Звання зростає зі славою, а з ним багатшає й вигляд козака.',
  all: 'Усі звання',
  current: 'Зараз',
  left: (left: number) => `Ще ${gloryAmount(left)}`,
  from: (glory: number) => `від ${glory}`,
  // Read before the name of a rank: the circle with its number is a picture.
  number: (number: number) => `${number}. `,
  progress: 'Твій поступ',
  toward: (target: number, rank: string) => `з ${target} до «${rank}»`,
  towardLabel: (glory: number, target: number, rank: string) => `${gloryAmount(glory)} з ${target} до звання «${rank}»`,
  top: 'Найвище звання здобуто.',
  toCossack: 'До козака',
  howTitle: 'Як здобути славу',
};

// §24.1: the header of the game tells the state of the cossack instead of repeating its sections.
export const statusTexts = {
  label: 'Стан козака',
  // The badge reads «Джура · 6/10»; a screen reader hears the words instead.
  rank: (rank: string, glory: number, target: number | null) =>
    target === null ? `Звання «${rank}», ${gloryAmount(glory)}` : `Звання «${rank}», ${glory} з ${target} ${gloryWord(target)}`,
  // The menu of the player: the account and its settings.
  menu: 'Меню гравця',
  // Under «Увійти через Google» in that menu: what a guest gains by signing in.
  signInWhy: 'Щоб не втратити славу й прогрес',
};

// §14, §24.1: the one history of every attempt, a section of the game.
export const gameHistoryTexts = {
  title: 'Історія',
  lead: 'Усі завершені бої, рівні походу й бої з Королем розбійників.',
  // The word after the number of attempts: «12 тренувань».
  total: (count: number) => plural(count, { one: 'тренування', few: 'тренування', many: 'тренувань' }),
  // Where an attempt comes from: a fight of the game, a level of the journey or a battle of the duel (§24.1).
  kinds: { fight: 'Бій', journey: 'Похід', duel: 'Фінальна битва' },
  journey: 'Похід',
  // Non-breaking spaces keep «етап 1» and «3 з 4» on one line.
  level: (campaign: string, stage: number, done: number, total: number) =>
    `${campaign} · етап\u00a0${stage} · ${done}\u00a0з\u00a0${total} підходів`,
  round: (number: number, done: number, total: number) => `Король розбійників · раунд\u00a0${number} · ${done}\u00a0з\u00a0${total} підходів`,
  empty: 'Історія ще порожня. Тут з’являться завершені бої й рівні походу.',
  toFight: 'До бою',
  toJourney: 'У похід',
};

// §15.5, §23, §24.1: the data of the player, a section of the game. The texts of its cards are those
// of the account (accountTexts).
export const settingsTexts = {
  title: 'Налаштування',
  // §24.11: the name the player gives the cossack, a guest too.
  nameTitle: 'Ім’я козака',
  nameLabel: 'Ім’я або псевдонім',
  nameText: 'Його видно над званням козака.',
  nameFallback: (name: string) => `Без нього козак носитиме ім’я з Google: ${name}.`,
  namePlaceholder: 'Наприклад, Іван Сірко',
  nameSave: 'Зберегти',
  nameSaved: 'Ім’я козака збережено.',
  nameCleared: 'Козак лишився без власного імені.',
};

export const energyTexts: Record<EnergyPool, { name: string; every: string }> = {
  fight: { name: 'Енергія боїв', every: '+1 кожні 2 години' },
  campaign: { name: 'Енергія походу', every: '+1 кожні 2 години' },
};

export const energyStatus = {
  value: (value: number, max: number) => `${value} / ${max}`,
  // What a screen reader says instead of the slash.
  spoken: (value: number, max: number) => `${value} з ${max}`,
  // In the header of the game, where the bolt alone names the energy.
  named: (name: string, value: number, max: number) => `${name}: ${value} з ${max}`,
  full: 'Повна',
  next: (time: string) => `+1 через ${time}`,
  empty: (time: string) => `Енергії немає. Наступна одиниця через ${time}.`,
  soon: 'менше хвилини',
};

// How long until the next unit: «1 год 5 хв», «35 хв», «менше хвилини».
export function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);

  if (minutes < 1) {
    return energyStatus.soon;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return [hours > 0 ? `${hours} год` : null, rest > 0 ? `${rest} хв` : null].filter(Boolean).join(' ');
}

// §6, resesign/Main.dc.html: the fight as the player puts it together, exercises by rounds.
export const fightHallTexts = {
  eyebrow: 'Бій',
  title: 'Бій',
  lead: 'Склади свій бій: вправи ліворуч, раунди праворуч. Виконай кожну клітинку — і перемога твоя.',
  grid: 'Сітка бою',
  exercise: 'Вправа',
  // «Р» for «раунд» in the head of a column; a screen reader hears the whole word.
  round: (round: number) => `Р${round}`,
  roundName: (round: number) => `Раунд ${round}`,
  reps: 'повт.',
  cell: (exercise: string, round: number) => `${exercise}, раунд ${round}`,
  less: (exercise: string, round: number) => `Менше: ${exercise}, раунд ${round}`,
  more: (exercise: string, round: number) => `Більше: ${exercise}, раунд ${round}`,
  addRound: 'Додати раунд',
  removeRound: (round: number) => `Прибрати раунд ${round}`,
  addExercise: 'Додати вправу',
  removeExercise: (exercise: string) => `Прибрати вправу ${exercise}`,
  exerciseTotal: (exercise: string) => `Разом ${exercise}`,
  roundTotal: (round: number) => `Разом за раунд ${round}`,
  hint: 'Порада: натисни «+» / «−» у клітинці, щоб змінити кількість повторів. Справа — сума по вправі, знизу — по раунду.',
  customFailed: 'Не вдалося завантажити твої вправи, доступні лише готові.',
  pickTitle: 'Додати вправу',
  pickNone: 'Усі вправи каталогу вже в бою. Додай власну.',
  custom: 'Власна вправа',
  manage: 'Мої вправи',
  summary: 'Твій бій',
  exercises: (count: number) => plural(count, { one: 'вправа', few: 'вправи', many: 'вправ' }),
  rounds: (count: number) => plural(count, { one: 'раунд', few: 'раунди', many: 'раундів' }),
  repsTotal: (count: number) => plural(count, { one: 'повтор', few: 'повтори', many: 'повторів' }),
  win: 'Перемога',
  winRule: (cells: number) =>
    cells === 1
      ? 'Виконано єдину клітинку.'
      : plural(cells, { one: 'Виконано всі {n} клітинку.', few: 'Виконано всі {n} клітинки.', many: 'Виконано всі {n} клітинок.' }),
  loss: 'Поразка',
  lossRule: 'Хоч одна клітинка не виконана.',
  reward: 'Нагорода',
  rewardRule: '+1 слава козаку',
  empty: 'Додай хоча б одну вправу.',
  start: 'До бою',
  cost: '· −1 енергія',
  noEnergy: 'Енергія боїв вичерпалася',
  resumeTitle: 'Незавершений бій',
  resumeProgress: (done: number, total: number) => `Виконано ${done} з ${total} підходів`,
  resume: 'Продовжити бій',
  refusal: 'Енергії для бою немає. Відпочинь: вона відновиться сама.',
  busy: 'У тебе є незавершений бій. Продовж його або відступи, а тоді починай новий.',
};

// The fight itself, set by set, on the screen of a battle (§6).
export const fightBattleTexts = {
  title: 'Бій',
  subtitle: (exercises: number, rounds: number) =>
    `${plural(exercises, { one: '{n} вправа', few: '{n} вправи', many: '{n} вправ' })} · ${plural(rounds, { one: '{n} раунд', few: '{n} раунди', many: '{n} раундів' })}`,
  round: 'Раунд',
  retreatText: 'Підходи, що лишилися, не буде виконано, а витрачена енергія не повернеться. У рахунку козака це поразка.',
};

// How a fight ended (§6, §24.3).
export const fightResultTexts = {
  winBadge: 'Перемога',
  winTitle: 'Бій виграно',
  winText: 'Усі підходи виконано.',
  lossBadge: 'Поразка',
  lossTitle: 'Бій програно',
  lossText: 'Не всі підходи виконано. Енергія відновиться, і можна спробувати знову.',
  sets: 'Підходів',
  reps: 'Повторень',
  glory: 'Слава',
  setsOf: (done: number, total: number) => `${done} з ${total}`,
  grid: 'Підходи бою',
  done: 'виконано',
  notDone: 'не виконано',
  gloryNote: 'Перемога в бою додає козакові славу.',
  noGlory: 'Слава приходить лише з перемогою.',
  repeat: 'Повторити',
  repeatCost: '· −1 енергія',
  newFight: 'Новий бій',
  history: 'Історія',
  // An attempt of a mode the site had before §6: the history keeps it as it was.
};

export const journeyTexts = {
  eyebrow: 'Похід',
  title: 'Похід «Січ»',
  lead: 'Неспокійно на землях Січі: зникають подорожні, грабують валки й хутори. За нападами стоять три розбійницькі ватаги, яких об’єднав таємничий Король розбійників. Обери кампанію — кожне випробування наближає перемогу.',
  available: 'Доступна',
  started: (passed: number, total: number) => `Розпочато · ${passed}/${total}`,
  passed: 'Пройдено',
  locked: 'Закрита',
  unavailable: 'Недоступно',
  preparing: 'Ще готується',
  finalLocked: 'Відкриється після трьох кампаній',
  enter: 'Вирушити в кампанію',
  continue: 'Продовжити кампанію',
  review: 'Переглянути карту',
  progress: 'Прогрес',
  stagesOf: (passed: number, total: number) => `${passed} / ${total} етапів`,
  peak: (exercise: string, peak: number) => `${exercise} · до ${peak} за підхід`,
  toJourney: 'Кампанії',
};

export const campaignTexts: Record<
  CampaignId,
  { name: string; lead: string; story: string; exercise: string; finale?: string }
> = {
  'black-flag': {
    name: campaignNames['black-flag'],
    lead: 'Велика, нахабна й добре озброєна ватага, яка тримає в страху дороги навколо Січі.',
    story: '«Чорний прапор» — це не таємнича банда, яка ховається в лісах. Сила ватаги — чисельність, груба фізична сила, залякування та контроль над дорогами. Пройди від перших нападів до самого Короля розбійників.',
    exercise: 'Відтискання',
    finale: 'Від перших нападів до тронного двору: Короля розбійників переможено, а дороги й поселення навколо Січі звільнено від влади Чорного прапора.',
  },
  'steppe-wolves': {
    name: campaignNames['steppe-wolves'],
    lead: 'Вершники тримають степові шляхи: швидкі нальоти, засідки й грабунок торгових валок.',
    story: 'Швидкість, мобільність і напади зненацька. Вершників веде Сірий Вовк зі шаблею та списом. Пройди від перших слідів на степових дорогах до його останньої стоянки.',
    exercise: 'Присідання',
    finale: 'Від перших слідів до вовчого гнізда: Сірого Вовка переможено, ватага Степових вовків розпалася, а степові шляхи звільнено від її нападів.',
  },
  'forest-ravens': {
    name: campaignNames['forest-ravens'],
    lead: 'Банда лісових розбійників тримає дороги й переправи, а награбоване ховає в глухих хащах.',
    story: 'Банда «Лісових круків» тримає в страху дороги й переправи, а награбоване ховає в глухих хащах. Іди їхнім слідом — аж до Гнізда Чорного Крука.',
    exercise: 'Підтягування',
    finale: 'Від перших слідів до Гнізда Чорного Крука: найхитрішу банду лісу розбито, а лісові дороги знову безпечні.',
  },
  'final-battle': {
    name: campaignNames['final-battle'],
    lead: 'Король розбійників — колишній козак, що зрадив Січ і зібрав три ватаги в справжню армію.',
    story: 'Жорстокий, хитрий і владний ватажок чекає там, де сходяться шляхи всіх трьох банд.',
    exercise: 'Відтискання, присідання й підтягування',
    finale: 'Три ватаги розбито, а зрадник Січі впав у чесному двобої. Землі навколо Січі знову безпечні.',
  },
};

export const levelTypeNames: Record<LevelType, string> = {
  normal: 'Звичайний рівень',
  'ladder-up': 'Драбина вгору',
  'ladder-down': 'Драбина вниз',
  'ladder-return': 'Драбина з поверненням',
};

export const statusNames: Record<Status, string> = {
  done: 'Пройдено',
  current: 'Доступно',
  locked: 'Закрито',
};

export const counts = {
  reps: (n: number) => plural(n, { one: '{n} повторення', few: '{n} повторення', many: '{n} повторень' }),
  sets: (n: number) => plural(n, { one: '{n} підхід', few: '{n} підходи', many: '{n} підходів' }),
  levels: (n: number) => plural(n, { one: '{n} рівень', few: '{n} рівні', many: '{n} рівнів' }),
};

export const mapTexts = {
  toJourney: 'Кампанії',
  campaign: (journey: string) => `${journey} · Кампанія`,
  campaignShort: 'Кампанія',
  passedStages: 'Пройдено',
  stagesOf: (total: number) => `/ ${total} етапів`,
  legend: 'Позначки на карті',
  legendItems: { done: 'Пройдено', current: 'Поточний', locked: 'Закрито' },
  next: (number: number, total: number) => `Наступний етап · ${number} з ${total}`,
  stageOf: (number: number, total: number) => `Етап ${number} з ${total}`,
  levelsOf: (passed: number, total: number) => `${passed} / ${total} рівнів`,
  levelsLabel: 'Рівні етапу',
  open: 'Відкрити етап',
  youAreHere: (name: string) => `Ти тут · ${name}`,
  stageMarker: (number: number, name: string, status: Status) => `Етап ${number}: ${name}, ${statusNames[status].toLowerCase()}`,
  campaignDone: 'Кампанію пройдено',
  locked: 'Кампанія ще закрита',
  lockedText: 'Ця кампанія ще готується. Поки що рушай до інших кампаній походу.',
};

export const stageMapTexts = {
  toCampaign: 'Карта кампанії',
  eyebrow: (campaign: string, number: number) => `${campaign} · Етап ${number}`,
  stage: (number: number) => `Етап ${number}`,
  levels: 'Рівні',
  selected: 'Вибраний рівень',
  hint: 'Натисни на точку на карті, щоб переглянути рівень.',
  marker: (number: number, name: string, status: Status, boss: boolean) =>
    `${boss ? 'Бос · ' : ''}Рівень ${number}: ${name}, ${statusNames[status].toLowerCase()}`,
  levelEyebrow: (number: number, type: string) => `Рівень ${number} · ${type}`,
  bossEyebrow: (number: number) => `Бос · Рівень ${number}`,
  bossLabel: (name: string) => `Бос · ${name}`,
  bossBadge: 'Бос',
  exercise: 'Вправа',
  scheme: 'Схема',
  total: 'Повторень',
  status: 'Статус',
  go: 'Перейти до випробування',
  challenge: 'Кинути виклик ватажку',
  closed: 'Закрито',
  opensAfter: (name: string) => `Відкриється після «${name}»`,
  stageLocked: 'Етап відкриється після попереднього',
  portrait: (name: string) => `Портрет: ${name}`,
};

export const prepTexts = {
  back: 'Повернутися до карти етапу',
  crumbs: (campaign: string, stage: string) => `${campaign} › ${stage}`,
  task: 'Завдання',
  total: 'Загалом',
  set: (number: number) => `Підхід ${number}`,
  repsShort: 'повт.',
  scheme: (scheme: string, sets: number) => `Схема ${scheme} · ${counts.sets(sets)}`,
  rest: 'Відпочинок — скільки потрібно',
  start: 'Почати випробування',
  startBoss: 'Кинути виклик ватажку',
  glory: (glory: number) => `За перемогу: +${glory} слави`,
  passed: 'Цей рівень уже пройдено. Слава за нього вже з тобою.',
  locked: 'Цей рівень ще закритий.',
  busyTitle: 'Незавершене випробування',
  busy: (name: string) => `Ти ще в бою на рівні «${name}». Заверши його або відступи, щоб почати інший.`,
  resume: 'Повернутися до бою',
  scene: 'Сцена: на лісовій дорозі козак перекриває шлях розбійнику, що намагається втекти',
  bossScene: (name: string) => `Сцена: ${name} чекає у своєму укріпленні`,
};

export const battleTexts = {
  exercise: (exercise: string, scheme: string) => `${exercise} · ${scheme}`,
  pause: 'Пауза',
  resume: 'Продовжити',
  retreat: 'Завершити',
  paused: 'Пауза — відпочинь і продовж, коли відновиш сили',
  progress: 'Підходи',
  doneReps: 'Виконано повторень',
  doneOf: (done: number, total: number) => `${done} з ${total}`,
  set: 'Підхід',
  doReps: 'Виконай повторень',
  rest: 'Відпочивай між підходами стільки, скільки потрібно. Почни наступний, коли відновиш сили.',
  setDone: 'Підхід виконано',
  allDone: 'Усі підходи виконано',
  allDoneReps: (total: number) => `${total} з ${total} повторень`,
  finish: 'Завершити бій',
  retreatTitle: 'Відступити з бою?',
  retreatText: 'Рівень не буде пройдено, а витрачена енергія не повернеться. У рахунку козака це поразка.',
  retreatConfirm: 'Відступити',
  keepGoing: 'Продовжити бій',
  saveFailedTitle: 'Не вдалося зберегти бій',
  saveFailed: 'Браузер не зберіг результат. Спробуй ще раз — без цього слава й рівень не зарахуються.',
};

export const victoryTexts = {
  badge: 'Перемога',
  bossBadge: 'Бос переможений',
  title: 'Розбійника схоплено',
  bossTitle: (accusative: string) => `${accusative} переможено`,
  passed: (number: number, name: string) => `Рівень ${number} · ${name} — пройдено`,
  exercise: 'Вправа',
  reps: 'Повторень',
  glory: 'Слава',
  nextLevel: 'Відкрито наступний рівень',
  stagePassed: (name: string) => `Етап «${name}» пройдено`,
  nextStage: (number: number) => `Відкрито етап ${number}`,
  campaignPassed: (name: string) => `Кампанію «${name}» пройдено`,
  campaignBonus: (glory: number) => `+${glory} слави за кампанію`,
  journeyBonus: (glory: number) => `+${glory} слави за похід`,
  newRank: 'Нове звання',
  next: 'Далі',
  toStage: 'До карти етапу',
  toCampaign: 'Далі — до карти кампанії',
  toJourney: 'Далі — до походу',
  scene: 'Сцена перемоги: козак стоїть над схопленим розбійником, зброя лежить на дорозі',
  bossScene: 'Сцена перемоги над босом: над захопленим укріпленням майорить козацький стяг, ворони розлітаються',
};

export const defeatTexts = {
  badge: 'Відступ',
  title: 'Цього разу ворог устояв',
  text: 'Відпочинь і повертайся, коли відновиш сили. Рівень чекає на тебе.',
  sets: 'Підходів',
  setsOf: (done: number, total: number) => `${done} / ${total}`,
  retry: 'Спробувати ще раз',
  toStage: 'До карти етапу',
  scene: 'Сцена: розбійник зникає в сутінковому лісі',
};

export const resultTexts = {
  notFound: 'Бій не знайдено',
  notFoundText: 'Можливо, його вже видалили разом із даними. Повертайся до походу.',
  pending: 'Бій збережено в цьому браузері. Він надішлеться на сервер, щойно з’явиться зв’язок.',
  rejected: 'Сервер не прийняв цей бій. Слава за нього не зарахується.',
};

// §24.9: the duel with the King of robbers, the final battle of the journey.
export const duelTexts = {
  eyebrow: 'Похід «Січ» · Фінальна битва',
  title: 'Король розбійників',
  story: 'Ти розбив усі три ватаги й нарешті дістався Короля розбійників. Колишній козак, що зрадив Січ, не тікає й не ховається за військом: він сам виходить на останній поєдинок. Це двобій двох козаків — зрадника й героя.',
  rules: 'Двобій має п’ять раундів, і кожен може забрати в Короля до 20 здоров’я. Шкода залежить від виконаних повторень. Зупинитися можна будь-коли: завдана шкода лишиться, а наступний бій почнеться з першого невиконаного підходу.',
  lockedTitle: 'Король чекає',
  lockedText: 'Двобій із Королем розбійників почнеться, коли ти пройдеш усі три кампанії походу.',
  health: 'Здоров’я Короля',
  healthLabel: (health: number, max: number) => `Здоров’я Короля: ${health} з ${max}`,
  rounds: 'Раунди двобою',
  round: (number: number) => `Раунд ${number}`,
  damage: 'Шкода',
  damageOf: (damage: number, max: number) => `${damage} / ${max}`,
  current: 'Наступний бій',
  sets: 'Підходи раунду',
  setDone: 'виконано',
  battleTitle: (number: number, name: string) => `Раунд ${number} · ${name}`,
  battleSubtitle: (sets: number) => `Двобій із Королем · ${counts.sets(sets)}`,
  retreatText: 'Завдана шкода лишиться, а наступний бій почнеться з першого невиконаного підходу. Витрачена енергія не повернеться.',
  start: 'До бою з Королем',
  goOn: 'Продовжити двобій',
  going: 'Двобій триває',
  busy: (name: string) => `Ти ще в бою на рівні «${name}». Заверши його або відступи, щоб вийти на двобій.`,
  glory: (glory: number) => `За раунд: +${glory} слави`,
  portrait: (stage: string) => `Король розбійників: ${stage}`,
  won: 'Короля розбійників переможено',
  toCossack: 'До козака',
  toJourney: 'До походу',
};

// §24.9: the King looks worse with every quarter of his health gone.
export const kingStageTexts: Record<KingStage, { name: string; text: string }> = {
  unbroken: { name: 'Незламний Король', text: 'Повністю екіпірований і впевнений у перемозі.' },
  wounded: { name: 'Поранений Король', text: 'Обладунки пошкоджені, з’явилися перші сліди поранень.' },
  enraged: { name: 'Розлючений Король', text: 'Спорядження сильно пошкоджене, а поза дедалі агресивніша.' },
  'last-breath': { name: 'Останній подих', text: 'Виснажений Король ледве тримається на ногах.' },
  defeated: { name: 'Переможений', text: 'Остаточна поразка Короля розбійників.' },
};

// §24.9: how a battle of the duel ended.
export const duelOutcomeTexts = {
  badge: 'Двобій',
  struck: 'Удар по Королю',
  title: (damage: number) => (damage > 0 ? `Король утратив ${damage} здоров’я` : 'Король устояв'),
  held: 'Король ще тримається. Відпочинь і повертайся: двобій продовжиться з першого невиконаного підходу.',
  dealt: 'Шкода',
  sets: 'Підходів',
  setsOf: (done: number, total: number) => `${done} / ${total}`,
  health: 'Здоров’я Короля',
  stage: (name: string) => `Король тепер: ${name}`,
  roundPassed: (name: string) => `Раунд «${name}» пройдено`,
  nextRound: (number: number) => `Відкрито раунд ${number}`,
  goOn: 'Продовжити двобій',
  toDuel: 'До двобою',
  scene: (stage: string) => `Сцена двобою: ${stage}`,
  victoryBadge: 'Перемога',
  victoryTitle: 'Короля розбійників переможено',
  victoryStory: 'Зрадник Січі впав у чесному двобої. Ватаги Чорного прапора, Степових вовків і Лісових круків розбито, а дороги, степи й ліси навколо Січі знову безпечні. Історію завершено, а твоє ім’я стає легендою Січі.',
  victoryScene: 'Сцена перемоги: Король розбійників лежить переможений, його шабля в руках козака, над Січчю майорить стяг',
};

// §24.9: the title and the trophy of the one who defeated the King, outside the ladder of ranks.
export const legendTexts = {
  heading: 'Легенда Січі',
  title: 'Оборонець Січі',
  titleLabel: 'Особливе звання',
  trophy: 'Шабля Короля розбійників',
  trophyLabel: 'Легендарна нагорода',
  trophyArt: 'Шабля Короля розбійників',
  won: (date: string) => `Короля розбійників переможено ${date}`,
};
