import type { ExerciseErrorCode } from '../domain/catalog/exercise';
import {
  DIFFICULTY_PERCENTS,
  EXERCISE_DESCRIPTION_MAX,
  EXERCISE_NAME_MAX,
  EXERCISES_MAX,
  LADDER_MAX,
  OPPONENT_BOUND_MAX,
  OPPONENT_BOUND_MIN,
  REPS_MAX,
  ROUNDS_MAX,
  ROUNDS_MIN,
} from '../domain/config/limits';
import type { Difficulty, Mode, WinRule } from '../domain/config/types';
import type { ConfigErrorCode } from '../domain/config/validation';
import type { Outcome } from '../domain/results/results';
import type { StorageErrorCode } from '../storage/errors';
import { plural } from './plural';

export const validationMessages: Record<ConfigErrorCode | ExerciseErrorCode, string> = {
  'mode-required': 'Обери режим тренування.',
  'rule-required': 'Обери умову перемоги: перевиконати чи виконати.',
  'exercises-required': 'Додай хоча б одну вправу.',
  'exercises-too-many': `В одному бою може бути не більше ${EXERCISES_MAX} вправ.`,
  'exercises-duplicate': 'Одну вправу не можна додати двічі.',
  'rounds-out-of-range': `Кількість раундів має бути від ${ROUNDS_MIN} до ${ROUNDS_MAX}.`,
  'target-required': 'Задай ціль для кожного раунду.',
  'target-invalid': `Ціль має бути цілим числом від 0 до ${REPS_MAX}.`,
  'opponent-range-required': 'Задай обидві межі результату суперника.',
  'opponent-bound-invalid': `Межі суперника мають бути цілими числами від ${OPPONENT_BOUND_MIN} до ${OPPONENT_BOUND_MAX}.`,
  'opponent-range-inverted': 'Нижня межа не може бути більшою за верхню.',
  'upper-bound-required': 'Задай верхню межу суперника.',
  'upper-bound-invalid': `Верхня межа має бути цілим числом від ${OPPONENT_BOUND_MIN} до ${OPPONENT_BOUND_MAX}.`,
  'difficulty-required': 'Обери рівень складності суперника.',
  'ladder-max-required': 'Задай максимум драбини.',
  'ladder-max-invalid': `Максимум драбини має бути цілим числом від 1 до ${LADDER_MAX}.`,
  'exercise-name-required': 'Введи назву вправи.',
  'exercise-name-too-long': `Назва вправи може містити до ${EXERCISE_NAME_MAX} символів.`,
  'exercise-name-taken': 'Вправа з такою назвою вже є в каталозі.',
  'exercise-description-too-long': `Опис вправи може містити до ${EXERCISE_DESCRIPTION_MAX} символів.`,
};

// §17.2: a failed save is explained and can be repeated.
export const storageMessages: Record<StorageErrorCode, string> = {
  offline: "Немає зв'язку із сервером. Перевір інтернет і спробуй ще раз.",
  server: 'Сервер зараз не відповідає. Спробуй ще раз за хвилину.',
  'rate-limited': 'Забагато дій поспіль. Зачекай кілька хвилин і спробуй ще раз.',
  rejected: 'Сервер не прийняв ці дані. Онови сторінку й спробуй ще раз.',
  'exercise-name-taken': validationMessages['exercise-name-taken'],
};

// Shown while the browser refuses localStorage and keeps the workout in memory only.
export const memoryOnlyWarning =
  'Браузер не дає зберегти тренування на цьому пристрої. Якщо оновити сторінку, незавершена спроба зникне.';

export const modeNames: Record<Mode, string> = {
  target: 'Ціль',
  'random-opponent': 'Випадковий суперник',
  'opponent-levels': 'Рівні суперників',
  ladder: 'Драбина',
};

// §16.4: before the start the player knows the task, the way to win and the length of an attempt.
export const modeGuides: Record<Mode, { task: string; win: string; length: string }> = {
  target: {
    task: 'Виконати задану кількість повторень для кожної вправи в кожному раунді.',
    win: 'Більше виграних раундів, ніж програних. Раунд — за кількістю виграних вправ.',
    length: 'Раунди × вправи. Наприклад, 5 раундів × 2 вправи = 10 етапів.',
  },
  'random-opponent': {
    task: 'Побити результат суперника — він випадковий у заданому тобою діапазоні.',
    win: 'Більше виграних раундів, ніж програних. Рівна кількість — нічия.',
    length: 'Раунди × вправи. Результат суперника видно до твого підходу.',
  },
  'opponent-levels': {
    task: 'Змагатися із суперником обраної складності: простий, середній чи складний.',
    win: 'Як у «Випадковому суперникові»: вправи → раунди → бій.',
    length: 'Раунди × вправи.',
  },
  ladder: {
    task: 'Пройти етапи 1 → 2 → … → максимум, за бажанням і назад униз. Одна вправа.',
    win: 'Пройдено всі етапи. Один непройдений етап — поразка. Нічиєї немає.',
    length: 'Максимум 5: 5 етапів, з поверненням — 9.',
  },
};

export const ruleTexts: Record<WinRule, { name: string; hint: string }> = {
  over: { name: 'Перевиконати', hint: 'більше за ціль' },
  meet: { name: 'Виконати', hint: 'ціль або більше' },
};

const percents = (difficulty: Difficulty) =>
  `${DIFFICULTY_PERCENTS[difficulty].low}–${DIFFICULTY_PERCENTS[difficulty].high}% від M`;

export const difficultyTexts: Record<Difficulty, { name: string; hint: string }> = {
  easy: { name: 'Простий', hint: percents('easy') },
  medium: { name: 'Середній', hint: percents('medium') },
  hard: { name: 'Складний', hint: `${percents('hard')}, іноді більше` },
};

// Results are told by a symbol and a word, never by color alone (§16.2).
export const outcomeTexts: Record<Outcome, { symbol: string; name: string; plural: string }> = {
  win: { symbol: '▲', name: 'Перемога', plural: 'Перемоги' },
  draw: { symbol: '=', name: 'Нічия', plural: 'Нічиї' },
  loss: { symbol: '▼', name: 'Поразка', plural: 'Поразки' },
};

export const counts = {
  rounds: (n: number) => plural(n, { one: '{n} раунд', few: '{n} раунди', many: '{n} раундів' }),
  exercises: (n: number) => plural(n, { one: '{n} вправа', few: '{n} вправи', many: '{n} вправ' }),
  stages: (n: number) => plural(n, { one: '{n} етап', few: '{n} етапи', many: '{n} етапів' }),
  wins: (n: number) => plural(n, { one: '{n} перемога', few: '{n} перемоги', many: '{n} перемог' }),
  losses: (n: number) => plural(n, { one: '{n} поразка', few: '{n} поразки', many: '{n} поразок' }),
};

export const commonTexts = {
  loading: 'Завантаження…',
  retry: 'Спробувати ще раз',
  cancel: 'Скасувати',
  save: 'Зберегти',
  back: 'Назад',
  home: 'Self-Fighter, на головну сторінку',
  history: 'Історія',
  account: 'Мої дані',
  newWorkout: 'Нове тренування',
  pending: 'Очікує надсилання',
  rejected: 'Не прийнято сервером',
};

export const modesTexts = {
  title: 'Обери режим',
  // Labels in capitals use a slash: a capital «З» looks like «3» in Manrope.
  step: 'Крок 1 / 2',
  group: 'Режим тренування',
  task: 'Завдання',
  win: 'Перемога',
  length: 'Тривалість',
  next: 'Далі — налаштування',
  resumeTitle: 'Незавершене тренування',
  resumeProgress: (mode: Mode, done: number, total: number) =>
    `${modeNames[mode]} · пройдено етапів: ${done} з ${total}`,
  resume: 'Продовжити',
  discard: 'Відкинути',
};

export const setupTexts = {
  title: (mode: Mode) => (mode === 'ladder' ? 'Налаштуй драбину' : 'Налаштуй бій'),
  step: (mode: Mode) => `Крок 2 / 2 · режим «${modeNames[mode]}»`,
  back: 'Назад до вибору режиму',
  exercises: (count: number) => `Вправи · ${count} / ${EXERCISES_MAX}`,
  exercise: 'Вправа',
  remove: (name: string) => `Прибрати вправу ${name}`,
  add: (name: string) => `Додати вправу ${name}`,
  pick: (name: string) => `Обрати вправу ${name}`,
  custom: 'Власна вправа',
  manage: 'Мої вправи',
  exercisesFailed: 'Не вдалося завантажити твої вправи, доступні лише готові.',
  rule: 'Умова перемоги',
  rounds: 'Раунди',
  roundsHint: `від ${ROUNDS_MIN} до ${ROUNDS_MAX}`,
  fewerRounds: 'Менше раундів',
  moreRounds: 'Більше раундів',
  targets: 'Цілі за раундами',
  round: 'Раунд',
  roundNumber: (round: number) => `Раунд ${round}`,
  cell: (name: string, round: number) => `${name}, раунд ${round}`,
  manual: 'змінено вручну',
  fill: 'Заповнити всі',
  fillLabel: (name: string) => `Заповнити всі раунди вправи ${name} значенням першого`,
  targetsNote:
    'Значення першого раунду копіюється в раунди, яких ще не змінено вручну. «Заповнити всі» перезаписує всі раунди значенням першого.',
  filled: (filled: number, rounds: number) => `заповнено ${filled} з ${rounds}`,
  opponent: 'Результат суперника',
  opponentHint: `від ${OPPONENT_BOUND_MIN} до ${OPPONENT_BOUND_MAX}`,
  min: 'від',
  max: 'до',
  // Read together with «від» or «до» next to the field.
  rangeLabel: (name: string) => `${name}, результат суперника`,
  difficulty: 'Складність суперника',
  upperBound: 'Верхня межа M',
  // Read after the name of the exercise.
  upperBoundSuffix: ', верхня межа M',
  levelRange: (min: number, max: number) => `суперник: ${min}–${max}`,
  ladderMax: 'Максимум драбини',
  ladderMaxHint: `від 1 до ${LADDER_MAX}`,
  returnDown: 'Повернення вниз після максимуму',
  ladderStages: (stages: readonly number[]) =>
    `${counts.stages(stages.length)}: ${stages.length > 3 ? `${stages[0]} → … → ${stages.at(-1)}` : stages.join(' → ')}`,
  startFight: 'Почати бій',
  startLadder: 'Почати драбину',
  errors: 'Виправ налаштування:',
};

export const exerciseFormTexts = {
  create: 'Власна вправа',
  edit: 'Змінити вправу',
  name: 'Назва',
  nameHint: `до ${EXERCISE_NAME_MAX} символів`,
  description: 'Опис, якщо потрібен',
  descriptionHint: `до ${EXERCISE_DESCRIPTION_MAX} символів`,
  manage: 'Мої вправи',
  empty: 'Власних вправ ще немає.',
  change: 'Змінити',
  changeLabel: (name: string) => `Змінити вправу ${name}`,
  delete: 'Видалити',
  deleteLabel: (name: string) => `Видалити вправу ${name}`,
  deleteQuestion: (name: string) => `Видалити вправу «${name}»? Збережені тренування не зміняться.`,
  close: 'Закрити',
};

export const fightTexts = {
  round: (round: number, rounds: number) => `Раунд ${round} з ${rounds}`,
  exercise: (index: number, count: number) => `Вправа ${index} з ${count}`,
  progress: 'Прогрес',
  stage: (index: number, count: number) => `Етап ${index} з ${count}`,
  you: 'Ти',
  rival: 'Суперник',
  won: 'Виграно',
  lost: 'Програно',
  roundsScore: '· раунди',
  score: (target: boolean, won: number, lost: number) =>
    target
      ? `Раундів виграно: ${won}, програно: ${lost}`
      : `Рахунок раундів — ти: ${won}, суперник: ${lost}`,
  rivalDid: 'Суперник зробив',
  goal: 'Ціль',
  need: (target: number, rule: WinRule) =>
    rule === 'over' ? `Щоб виграти — більше ${target}` : `Щоб виграти — ${target} або більше`,
  reps: 'Твій результат',
  fewer: 'Мінус одне повторення',
  more: 'Плюс одне повторення',
  repsError: `Введи ціле число від 0 до ${REPS_MAX} — порожнє поле не рахується.`,
  submit: 'Зафіксувати результат',
  exerciseWon: '▲ Перемога у вправі',
  exerciseLost: '▼ Поразка у вправі',
  versus: (actual: number, target: number) => `${actual} проти ${target}.`,
  roundOver: (round: number, won: number, lost: number, outcome: Outcome) =>
    `Раунд ${round}: ${counts.wins(won)}, ${counts.losses(lost)} — ${outcomeTexts[outcome].name.toLowerCase()}.`,
  nextExercise: 'Наступна вправа',
  nextRound: (round: number) => `Почати раунд ${round}`,
  interrupt: 'Перервати',
  interruptTitle: 'Перервати тренування?',
  interruptText: 'Результати цієї спроби не збережуться й не потраплять у статистику.',
  keepGoing: 'Продовжити тренування',
  saveFailedTitle: 'Спробу не збережено',
  saveFailed: 'Не вдалося зберегти спробу в цьому браузері. Спробуй ще раз.',
};

export const ladderTexts = {
  // Not «з поверненням»: in capitals the «З» reads as «3».
  name: (returnDown: boolean) => (returnDown ? 'Драбина · вгору й униз' : 'Драбина'),
  progress: (passed: number, total: number) => `Пройдено етапів: ${passed} з ${total}`,
  passed: (passed: number) => `Пройдено: ${passed}`,
  climb: 'Підйом · ціль',
  descent: 'Спуск · ціль',
  need: (target: number, rule: WinRule) =>
    rule === 'over' ? `Зроби більше ${target}` : `Зроби ${target} або більше`,
  submit: 'Зафіксувати етап',
  stagePassed: (stage: number) => `Етап ${stage} пройдено.`,
};

export const resultTexts = {
  notFound: 'Спробу не знайдено',
  notFoundText: 'Можливо, її видалено разом з усіма даними.',
  byRounds: 'за раундами',
  won: 'виграно',
  drawn: 'нічия',
  lost: 'програно',
  duration: (value: string) => `Тривалість ${value}`,
  rounds: 'Раунди',
  you: 'Ти',
  rival: 'Суп.',
  rivalFull: 'Суперник',
  goal: 'Ціль',
  exerciseWin: 'перемога',
  exerciseLoss: 'поразка',
  // A slash, as the display font draws «з» almost like «3».
  ladderPassed: (passed: number, total: number) => `${passed} / ${total}`,
  ladderStages: 'етапів пройдено',
  ladderMax: 'Максимум драбини',
  ladderBest: 'Найвищий пройдений етап',
  returnDown: 'Повернення вниз',
  yes: 'так',
  no: 'ні',
  rule: 'Умова',
  sequence: 'Етапи',
  stageResult: (target: number, actual: number | null, passed: boolean) =>
    actual === null
      ? `Етап ${target}: не дійшли`
      : `Етап ${target}: ${actual}, ${passed ? 'пройдено' : 'не пройдено'}`,
  pending: "Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.",
  rejected: 'Сервер не прийняв цю спробу, тож вона лишається тільки в цьому браузері.',
  repeat: 'Повторити',
  repeatNote: (mode: Mode) =>
    mode === 'random-opponent' || mode === 'opponent-levels'
      ? '«Повторити» — ті самі налаштування, нові результати суперника.'
      : '«Повторити» — ті самі налаштування.',
};

export const historyTexts = {
  title: 'Історія',
  stats: 'Загальна статистика',
  total: 'Завершено тренувань',
  modeFilter: 'Режим',
  outcomeFilter: 'Результат',
  all: 'Усі',
  modeShort: {
    target: 'Ціль',
    'random-opponent': 'Випадковий',
    'opponent-levels': 'Рівні',
    ladder: 'Драбина',
  } satisfies Record<Mode, string>,
  fightDetails: (rounds: number, exercises: number, won: number, lost: number) =>
    `${counts.rounds(rounds)} · ${counts.exercises(exercises)} · ${won} : ${lost}`,
  ladderDetails: (exercise: string, max: number, returnDown: boolean, passed: number, total: number) =>
    `${exercise} · до ${max}${returnDown ? ' і вниз' : ''} · ${passed} з ${total}`,
  empty: 'Ще немає завершених тренувань.',
  emptyFiltered: 'За цим фільтром тренувань немає.',
  start: 'Почати тренування',
  more: 'Показати ще',
  note: "Історія прив'язана до цього браузера. Перервані тренування не враховуються.",
};

export const accountTexts = {
  title: 'Мої дані',
  intro:
    "Ти граєш як гість. Тренування, власні вправи й налаштування зберігаються на сервері та прив'язані до цього браузера: в іншому браузері чи після очищення його даних історія почнеться з нуля.",
  nothing: 'Ще нічого не збережено.',
  exportTitle: 'Завантажити дані',
  exportText: 'Файл JSON з усіма тренуваннями, власними вправами й налаштуваннями.',
  export: 'Завантажити дані',
  fileName: 'self-fighter-data.json',
  deleteTitle: 'Видалити дані',
  deleteText: 'Історія, власні вправи й налаштування зникнуть назавжди.',
  delete: 'Видалити всі дані',
  deleteQuestion: 'Видалити всі дані?',
  deleteWarning: 'Історію, власні вправи й налаштування не вдасться відновити.',
  deleteConfirm: 'Видалити назавжди',
  deleted: 'Дані видалено.',
};

export const notFoundTexts = {
  title: 'Сторінку не знайдено',
  text: 'Такого екрана в грі немає.',
  back: 'До вибору режиму',
};
