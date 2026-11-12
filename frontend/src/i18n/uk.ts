import type { ExerciseErrorCode } from '../domain/catalog/exercise';
import { EXERCISE_DESCRIPTION_MAX, EXERCISE_NAME_MAX } from '../domain/config/limits';
import type { LegacyMode, WinRule } from '../domain/history/legacy';
import type { Outcome } from '../domain/results/results';
import type { StorageErrorCode } from '../storage/errors';
import { plural } from './plural';

export const validationMessages: Record<ExerciseErrorCode, string> = {
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

// §24.6: the modes the site had before a fight was put together freely (§6). The history still
// names their attempts.
export const modeNames: Record<LegacyMode, string> = {
  target: 'Ціль',
  'random-opponent': 'Випадковий суперник',
  'opponent-levels': 'Рівні суперників',
  ladder: 'Драбина',
};

export const ruleTexts: Record<WinRule, { name: string }> = {
  over: { name: 'Перевиконати' },
  meet: { name: 'Виконати' },
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
  workouts: (n: number) => plural(n, { one: '{n} тренування', few: '{n} тренування', many: '{n} тренувань' }),
  customExercises: (n: number) =>
    plural(n, { one: '{n} власна вправа', few: '{n} власні вправи', many: '{n} власних вправ' }),
};

// What the guest of the browser would bring to the account (§23.3): «3 тренування та 1 власна вправа».
function guestData(attempts: number, exercises: number): string {
  return [
    attempts > 0 ? counts.workouts(attempts) : null,
    exercises > 0 ? counts.customExercises(exercises) : null,
  ]
    .filter((part) => part !== null)
    .join(' та ');
}

export const commonTexts = {
  loading: 'Завантаження…',
  retry: 'Спробувати ще раз',
  cancel: 'Скасувати',
  save: 'Зберегти',
  toHistory: 'До історії',
  history: 'Історія',
  pending: 'Очікує надсилання',
  rejected: 'Не прийнято сервером',
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

export const ladderTexts = {
  // Not «з поверненням»: in capitals the «З» reads as «3».
  name: (returnDown: boolean) => (returnDown ? 'Драбина · вгору й униз' : 'Драбина'),
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
  roundNumber: (round: number) => `Раунд ${round}`,
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
  sequence: 'Етапи',
  stageResult: (target: number, actual: number | null, passed: boolean) =>
    actual === null
      ? `Етап ${target}: не дійшли`
      : `Етап ${target}: ${actual}, ${passed ? 'пройдено' : 'не пройдено'}`,
  pending: "Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.",
  rejected: 'Сервер не прийняв цю спробу, тож вона лишається тільки в цьому браузері.',
};

// §14: the history, a section of the game (§24.1).
export const historyTexts = {
  stats: 'Загальна статистика',
  modeFilter: 'Режим',
  outcomeFilter: 'Результат',
  all: 'Усі',
  // Non-breaking spaces keep «2 : 1» and «9 з 9» on one line.
  setsDetails: (rounds: number, exercises: number, done: number, total: number) =>
    `${counts.rounds(rounds)} · ${counts.exercises(exercises)} · ${done}\u00a0з\u00a0${total} підходів`,
  fightDetails: (rounds: number, exercises: number, won: number, lost: number) =>
    `${counts.rounds(rounds)} · ${counts.exercises(exercises)} · ${won}\u00a0:\u00a0${lost}`,
  ladderDetails: (exercise: string, max: number, returnDown: boolean, passed: number, total: number) =>
    `${exercise} · до\u00a0${max}${returnDown ? ' і вниз' : ''} · ${passed}\u00a0з\u00a0${total}`,
  emptyFiltered: 'За цим фільтром тренувань немає.',
  more: 'Показати ще',
  note: "Історія прив'язана до цього браузера.",
  accountNote: 'Історія відкривається на будь-якому пристрої після входу через Google.',
};

// §23: signing in with Google. The texts do not guess the gender of the person: «Вхід виконано», not «Ти ввійшов».
export const signInTexts = {
  // «Sign in with Google» as the rules of Google put it, in the language of the site.
  button: 'Увійти через Google',
  embedded:
    'Схоже, сайт відкрито всередині іншого застосунку, а там Google може не дозволити вхід. Відкрий сайт у Safari чи Chrome: у меню застосунку обери «Відкрити в браузері».',
  promptTitle: 'Історія на будь-якому пристрої',
  promptHistory:
    'Увійди через Google, і тренування, власні вправи й налаштування будуть доступні на будь-якому пристрої. Усе, що вже збережено тут, лишиться з тобою.',
  promptResult:
    'Перше тренування вже в історії. Щоб вона не залежала від цього браузера, увійди через Google.',
  dismiss: 'Закрити пропозицію увійти',
  done: 'Вхід виконано: тренування, вправи й налаштування тепер доступні на будь-якому пристрої.',
  cancelled: 'Вхід скасовано. Без входу гра працює так само.',
  failed: 'Не вдалося увійти через Google. Спробуй ще раз трохи згодом.',
  close: 'Закрити',
  joinTitle: 'Перенести дані цього браузера?',
  joinText: (attempts: number, exercises: number) =>
    `У цьому браузері є ${guestData(attempts, exercises)}, збережені без входу. Перенеси їх в обліковий запис, щоб усе було в одній історії: спроби не задублюються, вправи з однаковою назвою об'єднаються, а налаштування облікового запису залишаться. Якщо не переносити, ці дані лишаться тут і знову стануть доступні після виходу.`,
  join: 'Перенести',
  keepApart: 'Не переносити',
  joined: 'Дані браузера перенесено в обліковий запис.',
};

export const accountTexts = {
  intro:
    "Ти граєш як гість. Тренування, власні вправи й налаштування зберігаються на сервері та прив'язані до цього браузера: в іншому браузері чи після очищення його даних історія почнеться з нуля.",
  accountIntro:
    'Тренування, власні вправи й налаштування зберігаються в обліковому записі й відкриваються на будь-якому пристрої після входу через Google.',
  nothing: 'Ще нічого не збережено.',
  signInTitle: 'Вхід через Google',
  signInText:
    'Увійди, щоб бачити історію, власні вправи й налаштування на будь-якому пристрої. Усе, що вже збережено в цьому браузері, лишиться з тобою.',
  accountTitle: 'Обліковий запис Google',
  signOut: 'Вийти',
  signOutTitle: 'Вийти з облікового запису?',
  signOutUnsent: (count: number) =>
    `${counts.workouts(count)} ще не надіслано на сервер. Вони зачекають у цьому браузері й надішлються, коли ти знову ввійдеш тут.`,
  signedOut: 'Вихід виконано: дані облікового запису в цьому браузері більше не видно.',
  keptTitle: 'Дані без входу',
  keptText: (attempts: number, exercises: number) =>
    `У цьому браузері є ${guestData(attempts, exercises)}, збережені до входу. Їх можна перенести в обліковий запис, а інакше вони знову стануть доступні після виходу.`,
  join: 'Перенести в обліковий запис',
  exportTitle: 'Завантажити дані',
  exportText: 'Файл JSON з усіма тренуваннями, власними вправами й налаштуваннями.',
  export: 'Завантажити дані',
  fileName: 'self-fighter-data.json',
  deleteTitle: 'Видалити дані',
  deleteText: 'Історія, власні вправи й налаштування зникнуть назавжди.',
  accountDeleteText: 'Історія, власні вправи, налаштування й сам обліковий запис зникнуть назавжди.',
  delete: 'Видалити всі дані',
  deleteQuestion: 'Видалити всі дані?',
  deleteWarning: 'Історію, власні вправи й налаштування не вдасться відновити.',
  accountDeleteWarning: 'Обліковий запис, історію, власні вправи й налаштування не вдасться відновити.',
  deleteConfirm: 'Видалити назавжди',
  deleted: 'Дані видалено.',
};
