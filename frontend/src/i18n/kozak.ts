import type { EnergyPool } from '../domain/kozak/energy';
import type { CampaignId, LevelType } from '../domain/kozak/journey';
import type { Status } from '../domain/kozak/progress';
import type { Look, RankId } from '../domain/kozak/ranks';
import { campaignNames, levelName, stageName } from './kozak-names';
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
    figure: 'Козак у простій сорочці й шароварах, з дерев’яним києм.',
  },
  cossack: {
    group: 'Козацтво',
    figure: 'Козак у жупані з червоним поясом, із шаблею та наплічником.',
  },
  officer: {
    group: 'Старшина',
    figure: 'Козацький старшина в каптані зі шнурами, у шапці зі шликом, з перначем.',
  },
  general: {
    group: 'Генералітет',
    figure: 'Генеральний старшина в кунтуші з хутряним коміром, із самоцвітами на шаблі.',
  },
  hetman: {
    group: 'Вершина',
    figure: 'Гетьман у багряному кунтуші з булавою, під бунчуком.',
  },
};

export const kozakTexts = {
  section: 'Розділи гри',
  nav: { cossack: 'Козак', fight: 'Бій', journey: 'Похід', ranks: 'Звання', history: 'Історія', settings: 'Налаштування' },
  loading: 'Збираємо літопис козака…',
  notFound: 'Тут нічого немає',
  notFoundText: 'Можливо, в адресі помилка. Повернись до козака або в похід.',
  toCossack: 'До козака',
};

const gloryAmount = (glory: number) => plural(glory, { one: '{n} слава', few: '{n} слави', many: '{n} слави' });

// §24.3: what brings glory, on the screen of the cossack and of the ranks.
export const gloryRewards = [
  ['Перемога в бою', '+1'],
  ['Рівень походу', '+2'],
  ['Бос етапу', '+5'],
  ['Кампанію пройдено', '+10'],
  ['Похід пройдено', '+30'],
] as const;

export const cossackTexts = {
  title: 'Козак',
  rank: 'Звання:',
  // The word after the number of glory: «2 слави».
  gloryWord: (glory: number) => plural(glory, { one: 'слава', few: 'слави', many: 'слави' }),
  // «Ще 8 слави до звання «Заставний»», with the amount in bold.
  toNextBefore: 'Ще',
  toNextAmount: gloryAmount,
  toNextAfter: (rank: string) => `до звання «${rank}»`,
  toNext: (left: number, rank: string) => `Ще ${gloryAmount(left)} до звання «${rank}»`,
  top: 'Найвище звання здобуто.',
  help: 'Як здобути славу',
  fight: 'До бою',
  fightCost: '−1 енергії боїв',
  journey: 'У похід',
  journeyCost: '−1 енергії походу',
  record: 'Бойовий рахунок',
  wins: (count: number) => plural(count, { one: 'перемога', few: 'перемоги', many: 'перемог' }),
  draws: (count: number) => plural(count, { one: 'нічия', few: 'нічиї', many: 'нічиїх' }),
  losses: (count: number) => plural(count, { one: 'поразка', few: 'поразки', many: 'поразок' }),
  history: 'Історія боїв',
  // §24.8: the most repetitions done in one set of the journey, for every exercise of its campaigns.
  best: 'Рекорди походу',
  // After the number: «12 за підхід».
  bestUnit: 'за підхід',
  bestNone: 'ще немає',
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

// §14, §24.1: the one history of every attempt, a section of the game.
export const gameHistoryTexts = {
  title: 'Історія',
  lead: 'Усі завершені бої й рівні походу та старі тренування сайту.',
  // The word after the number of attempts: «12 тренувань».
  total: (count: number) => plural(count, { one: 'тренування', few: 'тренування', many: 'тренувань' }),
  // Where an attempt comes from: a fight of the game, a level of the journey or an old workout of the site (§24.1).
  kinds: { fight: 'Бій', journey: 'Похід', workout: 'Тренування' },
  journey: 'Похід',
  // Non-breaking spaces keep «етап 1» and «3 з 4» on one line.
  level: (campaign: string, stage: number, done: number, total: number) =>
    `${campaign} · етап\u00a0${stage} · ${done}\u00a0з\u00a0${total} підходів`,
  empty: 'Історія ще порожня. Тут з’являться завершені бої й рівні походу.',
  toFight: 'До бою',
  toJourney: 'У похід',
};

// §15.5, §23, §24.1: the data of the player, a section of the game. The texts of its cards are those
// of the account (accountTexts).
export const settingsTexts = {
  title: 'Налаштування',
};

export const energyTexts: Record<EnergyPool, { name: string; every: string }> = {
  fight: { name: 'Енергія боїв', every: '+1 кожні 2 год' },
  campaign: { name: 'Енергія походу', every: '+1 кожні 2 год' },
};

export const energyStatus = {
  value: (value: number, max: number) => `${value} / ${max}`,
  // What a screen reader says instead of the slash.
  spoken: (value: number, max: number) => `${value} з ${max}`,
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
  legacyNote: 'Це бій старого режиму сайту: його вже не повторити, але можна скласти новий.',
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
    story: 'Швидкість, мобільність і напади зненацька. Вершників веде Сірий Вовк зі шаблею та списом.',
    exercise: 'Присідання',
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
    exercise: 'Комбінація вправ',
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

interface StageText {
  readonly name: string;
  readonly story: string;
  // What the boss leaves behind: the line of the victory over it.
  readonly outcome: string;
}

interface LevelText {
  readonly name: string;
  // The label of the point on the map of a phone.
  readonly short: string;
  readonly story: string;
  // The boss as the title of the victory names it: «Ватажка розвідників переможено».
  readonly defeated?: string;
}

// §24.5: the story of the stages of «Чорний прапор» and «Лісові круки».
const stageStories: Readonly<Record<string, Omit<StageText, 'name'>>> = {
  'black-flag/1': {
    story: 'Ти вирушаєш на дорогу біля Січі, де почали зникати подорожні. Знаходиш сліди пограбувань і поступово виходиш на ватагу, яка нападає на самотніх мандрівників.',
    outcome: 'Першу ватагу розбійників знищено. Ти отримуєш перші відомості про Чорний прапор.',
  },
  'black-flag/2': {
    story: 'Сліди ведуть до місця, де збираються кілька розбійницьких загонів. Зруйнуй їхній осередок, перш ніж вони об’єднаються в одну велику силу.',
    outcome: 'Осередок розбійників зруйновано. Але стає зрозуміло, що за нападами стоїть організована система здирництва.',
  },
  'black-flag/3': {
    story: 'Розбійники більше не обмежуються пограбуваннями. Вони змушують навколишні поселення регулярно віддавати данину, погрожуючи спалити домівки тих, хто відмовиться. Звільни людей від їхньої влади.',
    outcome: 'Поселення звільнено від данини. Ти дізнаєшся про укріплений заслін, який перекриває головну дорогу до табору Чорного прапора.',
  },
  'black-flag/4': {
    story: 'Розбійники облаштували на дорозі укріплений блокпост. Дерев’яні загородження, щити та численна варта не дозволяють торговцям і подорожнім пройти далі. Зламай цей заслін.',
    outcome: 'Дорогу звільнено. Тепер ти можеш наблизитися до головного табору Чорного прапора.',
  },
  'black-flag/5': {
    story: 'Ти знаходиш великий табір банди. Тут навчаються нові бійці, зберігається награбоване та готуються нові напади. Щоб послабити Чорний прапор, необхідно зруйнувати його бойове ядро.',
    outcome: 'Основний табір захоплено, а бойове ядро банди розбито. Проте частина розбійників відступила й готує велику засідку.',
  },
  'black-flag/6': {
    story: 'Залишки банди готують масштабну засідку на торговий караван. Вистеж нападників, зірви їхній план і переможи командира, який керує засідкою.',
    outcome: 'Караван врятовано, а залишки банди втратили можливість контролювати торгові шляхи.',
  },
  'black-flag/7': {
    story: 'Ти дізнаєшся, що Чорний прапор має окремий загін найжорстокіших бійців. Вони не займаються звичайними пограбуваннями — їх відправляють туди, де потрібна сила та залякування. Цей загін необхідно знищити.',
    outcome: 'Елітний загін Чорного прапора знищено. Тепер шлях до головного табору відкритий.',
  },
  'black-flag/8': {
    story: 'Ти наближаєшся до головного табору, де зібралися найбільші сили банди. Тут перебувають досвідчені бійці, командири та залишки всіх розбитих загонів. Попереду — вирішальний штурм.',
    outcome: 'Головні сили банди розбиті. Король розбійників відступає до останнього укріплення, залишивши перед собою особисту охорону.',
  },
  'black-flag/9': {
    story: 'Король розбійників сховався у своєму останньому укріпленні. Перед ним стоїть особиста варта — найвідданіші та найнебезпечніші бійці. Подолай їх, щоб дістатися до головного ворога.',
    outcome: 'Особисту охорону Короля розбійників переможено. Залишився лише сам ватажок.',
  },
  'black-flag/10': {
    story: 'Ти нарешті дістаєшся до головного ворога. Король розбійників зібрав усе, що залишилося від Чорного прапора, і готується до останнього бою. Перемога над ним означатиме кінець банди.',
    outcome: 'Короля розбійників переможено. Ватага Чорного прапора розпалася, а дороги та поселення звільнено від її влади.',
  },
  'forest-ravens/1': {
    story: 'Ти натрапляєш на сліди розбійників. Поки що невідомо, наскільки велика їхня банда. Почни розслідування та знайди тих, хто стежить за лісовими дорогами.',
    outcome: 'Круки втратили очі на лісових дорогах, але їхня мережа сягає вглиб лісу.',
  },
  'forest-ravens/2': {
    story: 'Слід веде вглиб лісу: дозорні пости, приховані стежки й ціла система розвідки банди. Наприкінці чекає той, хто нею керує, — Володар круків.',
    outcome: 'Розвідку банди зламано. Попереду територія, де збираються її бойові загони.',
  },
  'forest-ravens/3': {
    story: 'Тут уже немає простих дозорців: досвідчені бійці тренуються й готуються до нападів на поселення. Здолай їхню оборону й вийди на Чорну галявину, де чекає Сірий Крук.',
    outcome: 'Бойові загони розбито. Банда відступає до старої лісової застави.',
  },
  'forest-ravens/4': {
    story: 'Розбійники перетворили стару заставу на укріплений опорний пункт: звідси вони тримають дороги й тут ховають припаси. Подолай охорону, проникни за укріплення й зламай оборону.',
    outcome: 'Заставу захоплено. Серед припасів — відомості про переправу, якою банда возить здобич.',
  },
  'forest-ravens/5': {
    story: 'Переправу через велику річку тримають розбійники: збирають данину, стережуть човни й нікого не пускають без дозволу. Подолай охорону обох берегів і зламай їхній контроль над річкою.',
    outcome: 'Переправу звільнено. Далі ліс, який банда обплела цілою системою пасток.',
  },
  'forest-ravens/6': {
    story: 'Ями, розтяжки, тенета й механічні пастки стережуть схованки банди. Шукай безпечні проходи й пробивайся крізь загони, що заманюють переслідувачів у пастки.',
    outcome: 'Ловця переможено. Він видає того, хто готує отруту для стріл і пасток.',
  },
  'forest-ravens/7': {
    story: 'Отрута робить засідки банди особливо небезпечними: навіть невелика рана виводить воїна з бою. Знайди місця збору рослин, приховані майстерні й запаси отрути та знищ виробництво.',
    outcome: 'Виробництво отрути знищено. Записи травника ведуть до головної бази — Чорного лігва.',
  },
  'forest-ravens/8': {
    story: 'Глибоко в лісі банда облаштувала головну базу: тут живуть розбійники, зберігають награбоване й тренують бійців. Подолай численну охорону й розбий основні сили.',
    outcome: 'Лігво захоплено. Та Чорний Крук давно перебрався до Воронячої вежі.',
  },
  'forest-ravens/9': {
    story: 'Зі спостережного пункту на високій скелі лучники Чорного Крука тримають підходи до лісу й передають сигнали між загонами. Пройди повз дозорців і піднімися нагору.',
    outcome: 'Вежу захоплено. Серед залишених речей — шлях до останньої схованки ватажка.',
  },
  'forest-ravens/10': {
    story: 'Серед скель, старих дерев і підземних ходів ховається сам ватажок. Найвідданіші бійці захищатимуть його до останнього. Попереду битва, яка вирішить долю банди.',
    outcome: 'Банда втратила ватажка, її загони розпадаються, а лісові дороги знову безпечні для подорожніх.',
  },
};

// §24.5: every level of «Чорний прапор» and «Лісові круки» by its id.
const levelStories: Readonly<Record<string, Omit<LevelText, 'name'>>> = {
  'black-flag/1/1': {
    short: 'Сліди',
    story: 'Ти знаходиш перші сліди розбійників і перевіряєш покинутий шлях.',
  },
  'black-flag/1/2': {
    short: 'Віз',
    story: 'Біля розбитого воза ти стикаєшся з двома грабіжниками.',
  },
  'black-flag/1/3': {
    short: 'Напад',
    story: 'Розбійники помічають тебе й намагаються зупинити.',
  },
  'black-flag/1/4': {
    short: 'Стежка',
    story: 'Ти знаходиш прихований маршрут, яким бандити повертаються до свого сховку.',
  },
  'black-flag/1/5': {
    short: 'Засідка',
    story: 'На тебе нападає основна частина невеликої ватаги.',
  },
  'black-flag/1/6': {
    short: 'Ватажок',
    story: 'Переможи ватажка й дізнайся, хто насправді організовує напади.',
    defeated: 'Ватажка грабіжників',
  },
  'black-flag/2/1': {
    short: 'Дозор',
    story: 'Ти натрапляєш на варту, яка охороняє підходи до табору.',
  },
  'black-flag/2/2': {
    short: 'Табір',
    story: 'Ти проникаєш до першого табору й розбиваєш загін грабіжників.',
  },
  'black-flag/2/3': {
    short: 'Загін',
    story: 'На шляху до головного осередку доводиться подолати кілька груп противників.',
  },
  'black-flag/2/4': {
    short: 'Здобич',
    story: 'Ти знаходиш місце, де розбійники зберігають награбоване.',
  },
  'black-flag/2/5': {
    short: 'Шлях',
    story: 'Останній загін перекриває дорогу до ватажка.',
  },
  'black-flag/2/6': {
    short: 'Душогуб',
    story: 'Перед тобою жорстокий командир, який тримає кілька ватаг у покорі.',
    defeated: 'Душогуба',
  },
  'black-flag/3/1': {
    short: 'Поселення',
    story: 'Ти бачиш наслідки поборів і допомагаєш селянам.',
  },
  'black-flag/3/2': {
    short: 'Данина',
    story: 'Ти знищуєш загін, який забирає в людей останні припаси.',
  },
  'black-flag/3/3': {
    short: 'Варта',
    story: 'На шляху до головного пункту збору доводиться подолати охорону.',
  },
  'black-flag/3/4': {
    short: 'Караван',
    story: 'Ти перехоплюєш караван, який везе награбоване до старшого здирника.',
  },
  'black-flag/3/5': {
    short: 'Двір',
    story: 'Ти прориваєшся до укріпленого двору командира.',
  },
  'black-flag/3/6': {
    short: 'Здирник',
    story: 'Відбувається вирішальний бій із людиною, яка керує поборами в окрузі.',
    defeated: 'Старшого здирника',
  },
  'black-flag/4/1': {
    short: 'Дорога',
    story: 'Ти знаходиш перші загородження та розбиваєш передовий загін.',
  },
  'black-flag/4/2': {
    short: 'Варта',
    story: 'Ти пробиваєшся крізь охорону блокпоста.',
  },
  'black-flag/4/3': {
    short: 'Загорожі',
    story: 'Ти знищуєш перешкоди, що захищають позиції розбійників.',
  },
  'black-flag/4/4': {
    short: 'Щити',
    story: 'На вузькому проході тебе зустрічає щільна лінія щитоносців.',
  },
  'black-flag/4/5': {
    short: 'Пост',
    story: 'Ти добираєшся до головного укріплення.',
  },
  'black-flag/4/6': {
    short: 'Щитоносець',
    story: 'Ти вступаєш у бій із велетнем, який особисто тримає заслін.',
    defeated: 'Щитоносця',
  },
  'black-flag/5/1': {
    short: 'Варта',
    story: 'Ти проникаєш до табору, здолавши охорону.',
  },
  'black-flag/5/2': {
    short: 'Намети',
    story: 'Ти зачищаєш житлову частину табору.',
  },
  'black-flag/5/3': {
    short: 'Майданчик',
    story: 'Ти знищуєш загін, який готує нових бійців.',
  },
  'black-flag/5/4': {
    short: 'Склад',
    story: 'Ти знаходиш і звільняєш полонених, а також знищуєш запаси здобичі.',
  },
  'black-flag/5/5': {
    short: 'Серце',
    story: 'Ти наближаєшся до головної бойової сили банди.',
  },
  'black-flag/5/6': {
    short: 'Костолом',
    story: 'На твоєму шляху стає велетень із важкою булавою.',
    defeated: 'Костолома',
  },
  'black-flag/6/1': {
    short: 'Сліди',
    story: 'Ти знаходиш місце, де розбійники готують напад.',
  },
  'black-flag/6/2': {
    short: 'Загін',
    story: 'Ти знищуєш групу розвідників, які стежать за караваном.',
  },
  'black-flag/6/3': {
    short: 'Заслін',
    story: 'Ти прибираєш перешкоди та долаєш охорону.',
  },
  'black-flag/6/4': {
    short: 'Переправа',
    story: 'Ти захоплюєш переправу, через яку має пройти караван.',
  },
  'black-flag/6/5': {
    short: 'Засідка',
    story: 'Ти вступаєш у бій з основними силами нападників.',
  },
  'black-flag/6/6': {
    short: 'Командир',
    story: 'Переможи командира, який керує засідкою.',
    defeated: 'Командира засідки',
  },
  'black-flag/7/1': {
    short: 'Сліди',
    story: 'Ти знаходиш сліди елітного загону.',
  },
  'black-flag/7/2': {
    short: 'Варта',
    story: 'Ти долаєш охоронців, які захищають стоянку.',
  },
  'black-flag/7/3': {
    short: 'Загін',
    story: 'Ти вступаєш у бій із добре підготовленими бійцями.',
  },
  'black-flag/7/4': {
    short: 'Обладунки',
    story: 'Ти стикаєшся з озброєними головорізами.',
  },
  'black-flag/7/5': {
    short: 'Стоянка',
    story: 'Ти пробиваєшся до головного укріплення загону.',
  },
  'black-flag/7/6': {
    short: 'Головоріз',
    story: 'Переможи найсильнішого бійця елітного підрозділу.',
    defeated: 'Чорного головоріза',
  },
  'black-flag/8/1': {
    short: 'Укріплення',
    story: 'Ти починаєш штурм головного табору.',
  },
  'black-flag/8/2': {
    short: 'Лінія',
    story: 'Ти прориваєшся крізь основні оборонні позиції.',
  },
  'black-flag/8/3': {
    short: 'Штурм',
    story: 'Ти долаєш найміцніші загородження табору.',
  },
  'black-flag/8/4': {
    short: 'Двір',
    story: 'Ти знищуєш загін, який охороняє внутрішню частину табору.',
  },
  'black-flag/8/5': {
    short: 'Намет',
    story: 'Ти дістаєшся місця, звідки керують усіма силами банди.',
  },
  'black-flag/8/6': {
    short: 'Отаман',
    story: 'Ти вступаєш у бій із командиром головної ватаги.',
    defeated: 'Старшого отамана',
  },
  'black-flag/9/1': {
    short: 'Відступ',
    story: 'Ти йдеш слідом за ворогом до останнього укріплення.',
  },
  'black-flag/9/2': {
    short: 'Дозор',
    story: 'Ти долаєш розвідників, які охороняють підступи.',
  },
  'black-flag/9/3': {
    short: 'Варта',
    story: 'Ти прориваєшся крізь основну охорону.',
  },
  'black-flag/9/4': {
    short: 'Заслін',
    story: 'Ти знищуєш останній оборонний загін.',
  },
  'black-flag/9/5': {
    short: 'Покої',
    story: 'Ти наближаєшся до місця, де переховується Король розбійників.',
  },
  'black-flag/9/6': {
    short: 'Правиця',
    story: 'На твоєму шляху стає найвідданіший воїн головного ватажка.',
    defeated: 'Правицю Короля',
  },
  'black-flag/10/1': {
    short: 'Фортеця',
    story: 'Ти починаєш штурм останнього укріплення банди.',
  },
  'black-flag/10/2': {
    short: 'Варта',
    story: 'Ти долаєш найвідданіших охоронців ватажка.',
  },
  'black-flag/10/3': {
    short: 'Брама',
    story: 'Ти прориваєшся крізь головний вхід.',
  },
  'black-flag/10/4': {
    short: 'Зала',
    story: 'Ти проходиш через останній оборонний рубіж.',
  },
  'black-flag/10/5': {
    short: 'Двір',
    story: 'Ти дістаєшся місця, де чекає Король розбійників.',
  },
  'black-flag/10/6': {
    short: 'Король',
    story: 'Відбувається фінальна битва за долю Чорного прапора.',
    defeated: 'Короля розбійників',
  },
  'forest-ravens/1/1': {
    short: 'Дорога',
    story: 'На лісовій дорозі ти помічаєш самотнього розбійника-дозорця. Він намагається втекти, але ти перекриваєш йому шлях.',
  },
  'forest-ravens/1/2': {
    short: 'Варта',
    story: 'Двоє дозорців чергують над дорогою. Здолай варту й дізнайся перші відомості про розбійників.',
  },
  'forest-ravens/1/3': {
    short: 'Табір',
    story: 'Підказки ведуть до прихованого табору дозорців. Сліди регулярних патрулів кажуть: хтось керує їхньою розвідкою.',
  },
  'forest-ravens/1/4': {
    short: 'Ватажок',
    story: 'Старший дозорців засів в укріпленні на пагорбі. Переможи його й дізнайся, як далеко сягає мережа банди.',
    defeated: 'Ватажка розвідників',
  },
  'forest-ravens/2/1': {
    short: 'Ворони',
    story: 'Над місцями, де сидять розбійники-спостерігачі, кружляють птахи. Іди туди, куди вони вказують.',
  },
  'forest-ravens/2/2': {
    short: 'Хащі',
    story: 'Шлях лежить через густий ліс, де на кожній стежці розставлено дозори.',
  },
  'forest-ravens/2/3': {
    short: 'Гніздо',
    story: 'Серед гілля прихований спостережний пункт розвідників.',
  },
  'forest-ravens/2/4': {
    short: 'Тривога',
    story: 'Розбійники піднімають тривогу й скликають підмогу.',
  },
  'forest-ravens/2/5': {
    short: 'Пункт',
    story: 'Захопи основний пункт розвідників банди.',
  },
  'forest-ravens/2/6': {
    short: 'Дозор',
    story: 'Остання перешкода на шляху до ватажка розвідки.',
  },
  'forest-ravens/2/7': {
    short: 'Ватажок',
    story: 'Керівник розвідувальної мережі банди знає кожну стежку цього лісу.',
    defeated: 'Володаря круків',
  },
  'forest-ravens/3/1': {
    short: 'Межа',
    story: 'Ти виходиш на територію бойових загонів і стикаєшся з першими досвідченими бійцями.',
  },
  'forest-ravens/3/2': {
    short: 'Пера',
    story: 'Позначками на деревах розбійники відмічають маршрути й місця збору загонів.',
  },
  'forest-ravens/3/3': {
    short: 'Стежка',
    story: 'Пробирайся прихованим маршрутом, який охороняє бойовий загін.',
  },
  'forest-ravens/3/4': {
    short: 'Знак',
    story: 'Умовний знак вказує на місце збору основних сил банди.',
  },
  'forest-ravens/3/5': {
    short: 'Вартові',
    story: 'Найсильніший загін охороняє центральну територію лісу.',
  },
  'forest-ravens/3/6': {
    short: 'Галявина',
    story: 'Перед тобою місце, де розбійники тренуються й готуються до нападів.',
  },
  'forest-ravens/3/7': {
    short: 'Ватажок',
    story: 'Командир бойових загонів, що охороняють центральну частину лісу.',
    defeated: 'Сірого Крука',
  },
  'forest-ravens/4/1': {
    short: 'Стежка',
    story: 'Вузька дорога серед каміння й дерев веде до застави. Тебе зустрічає зовнішня варта.',
  },
  'forest-ravens/4/2': {
    short: 'Брама',
    story: 'Старий вхід розбійники укріпили й зробили головним проходом.',
  },
  'forest-ravens/4/3': {
    short: 'Сторожа',
    story: 'Загін, що охороняє внутрішню територію застави, вступає в бій.',
  },
  'forest-ravens/4/4': {
    short: 'Обхід',
    story: 'Пробирайся менш захищеним боком застави, оминаючи основну оборону.',
  },
  'forest-ravens/4/5': {
    short: 'Пролом',
    story: 'Подолай останню лінію захисту й відкрий шлях до внутрішнього двору.',
  },
  'forest-ravens/4/6': {
    short: 'Сторож',
    story: 'Досвідчений боєць особисто захищає заставу й без бою чужинця не пропустить.',
    defeated: 'Кам’яного Сторожа',
  },
  'forest-ravens/5/1': {
    short: 'Підхід',
    story: 'Розбійники стережуть підхід до річкової переправи.',
  },
  'forest-ravens/5/2': {
    short: 'Берег',
    story: 'Знайди місця, звідки банда стежить за подорожніми.',
  },
  'forest-ravens/5/3': {
    short: 'Сліди',
    story: 'Сліди човнів ведуть до прихованих стоянок розбійників.',
  },
  'forest-ravens/5/4': {
    short: 'Під вогнем',
    story: 'Перетинай річку, поки лучники з протилежного берега обстрілюють тебе.',
  },
  'forest-ravens/5/5': {
    short: 'Брід',
    story: 'Мілководдям пробивайся крізь останню охорону переправи.',
  },
  'forest-ravens/5/6': {
    short: 'Переправник',
    story: 'Господар переправи збирає данину, керує човнярами й тримає річку.',
    defeated: 'Переправника',
  },
  'forest-ravens/6/1': {
    short: 'Стежка',
    story: 'Ти вступаєш на територію пасток і ледь не падаєш у першу приховану яму.',
  },
  'forest-ravens/6/2': {
    short: 'Ями',
    story: 'Замасковані провалля перекривають основні проходи.',
  },
  'forest-ravens/6/3': {
    short: 'Тенета',
    story: 'Дерева з’єднано мотузками й сітями: розбійники хочуть узяти тебе живим.',
  },
  'forest-ravens/6/4': {
    short: 'Розтяжки',
    story: 'Мотузки, сигнальні дзвіночки й пастки попереджають банду про чужинців.',
  },
  'forest-ravens/6/5': {
    short: 'Засідка',
    story: 'Мисливці банди заманюють тебе в засідку, але ти виходиш на слід майстра пасток.',
  },
  'forest-ravens/6/6': {
    short: 'Ловець',
    story: 'Найкращий майстер пасток банди сам облаштовував ці проходи й керує засідками.',
    defeated: 'Ловця',
  },
  'forest-ravens/7/1': {
    short: 'Сліди',
    story: 'Залишки небезпечних рослин видають тих, хто їх збирає.',
  },
  'forest-ravens/7/2': {
    short: 'Трави',
    story: 'Тут травники збирають рослини для отрути.',
  },
  'forest-ravens/7/3': {
    short: 'Зілля',
    story: 'Перша прихована майстерня, де готують отруйні суміші.',
  },
  'forest-ravens/7/4': {
    short: 'Стріли',
    story: 'На складі — стріли з наконечниками в отруті.',
  },
  'forest-ravens/7/5': {
    short: 'Майстерня',
    story: 'Головне місце виробництва: знищ запаси отрути.',
  },
  'forest-ravens/7/6': {
    short: 'Травник',
    story: 'Головний знавець отрут банди готує суміші для стріл і пасток.',
    defeated: 'Чорного Травника',
  },
  'forest-ravens/8/1': {
    short: 'Підхід',
    story: 'Прихована стежка до головної бази замаскована природними укриттями.',
  },
  'forest-ravens/8/2': {
    short: 'Варта',
    story: 'Дозорці охороняють периметр табору й стежать за кожним підходом.',
  },
  'forest-ravens/8/3': {
    short: 'Сховище',
    story: 'Тут банда тримає награбоване майно, зброю й припаси.',
  },
  'forest-ravens/8/4': {
    short: 'Табір',
    story: 'Основні сили банди, що живуть у лігві, стають до бою.',
  },
  'forest-ravens/8/5': {
    short: 'Лігво',
    story: 'Пробивайся до центру табору, де живуть командири й збираються ватажки.',
  },
  'forest-ravens/8/6': {
    short: 'Отаман',
    story: 'Керівник головної бази розподіляє здобич і готує напади.',
    defeated: 'Старшого Отамана',
  },
  'forest-ravens/9/1': {
    short: 'Стежка',
    story: 'Чорні пера на деревах позначають безпечний шлях до вежі.',
  },
  'forest-ravens/9/2': {
    short: 'Пости',
    story: 'З цих пунктів лучники стежать за всією околицею.',
  },
  'forest-ravens/9/3': {
    short: 'Лучники',
    story: 'Досвідчені лучники обстрілюють підступи до вежі.',
  },
  'forest-ravens/9/4': {
    short: 'Підніжжя',
    story: 'Біля основи вежі тебе зустрічає посилена охорона.',
  },
  'forest-ravens/9/5': {
    short: 'Сходи',
    story: 'Піднімайся до верхнього майданчика, долаючи останніх захисників.',
  },
  'forest-ravens/9/6': {
    short: 'Правиця',
    story: 'Особистий охоронець ватажка прикриває його відступ і не пропустить тебе далі.',
    defeated: 'Правицю Чорного Крука',
  },
  'forest-ravens/10/1': {
    short: 'Стежа',
    story: 'Прихований шлях до Гнізда веде повз природні укриття й замасковані проходи.',
  },
  'forest-ravens/10/2': {
    short: 'Варта',
    story: 'Найвідданіші охоронці ватажка стережуть підступи до схованки.',
  },
  'forest-ravens/10/3': {
    short: 'Лучники',
    story: 'Елітні стрільці займають позиції серед скель і дерев.',
  },
  'forest-ravens/10/4': {
    short: 'Зала',
    story: 'У центральному приміщенні схованки ватажок збирає командирів і віддає накази.',
  },
  'forest-ravens/10/5': {
    short: 'Скарбниця',
    story: 'Награбовані багатства, зброя й цінності, які банда збирала роками.',
  },
  'forest-ravens/10/6': {
    short: 'Лігво',
    story: 'Останні охоронці стоять перед місцем, де переховується Чорний Крук.',
  },
  'forest-ravens/10/7': {
    short: 'Чорний Крук',
    story: 'Головний ватажок банди роками тримав у страху навколишні землі.',
    defeated: 'Чорного Крука',
  },
};

export function stageText(campaign: string, stage: number): StageText {
  const story = stageStories[`${campaign}/${stage}`] ?? { story: '', outcome: '' };

  return { name: stageName(campaign, stage), ...story };
}

export function levelText(id: string): LevelText {
  return { name: levelName(id), ...(levelStories[id] ?? { short: id, story: '' }) };
}

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
  lockedText: 'Ця кампанія ще готується. Поки що рушай до «Лісових круків».',
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
  finish: 'Завершити тренування',
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
