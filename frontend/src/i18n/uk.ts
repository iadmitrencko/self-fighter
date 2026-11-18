import type { ExerciseErrorCode } from '../domain/catalog/exercise';
import { EXERCISE_DESCRIPTION_MAX, EXERCISE_NAME_MAX } from '../domain/config/limits';
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
  'signed-out': 'Вхід у гру завершився. Онови сторінку й увійди через Google ще раз.',
  'exercise-name-taken': validationMessages['exercise-name-taken'],
};

// Shown while the browser refuses localStorage and keeps the workout in memory only.
export const memoryOnlyWarning =
  'Браузер не дає зберегти тренування на цьому пристрої. Якщо оновити сторінку, незавершена спроба зникне.';

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
};

// A short message that floats over the screen and goes away by itself (app/toast.ts).
export const toastTexts = {
  close: 'Закрити',
};

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

export const resultTexts = {
  notFound: 'Спробу не знайдено',
  notFoundText: 'Можливо, її видалено разом з усіма даними.',
  duration: (value: string) => `Тривалість ${value}`,
  pending: "Спроба очікує надсилання: вона піде на сервер, щойно з'явиться зв'язок.",
  rejected: 'Сервер не прийняв цю спробу, тож вона лишається тільки в цьому браузері.',
};

// §14: the history, a section of the game (§24.1).
export const historyTexts = {
  stats: 'Загальна статистика',
  modeFilter: 'Режим',
  outcomeFilter: 'Результат',
  all: 'Усі',
  // Non-breaking spaces keep «9 з 9» on one line.
  setsDetails: (rounds: number, exercises: number, done: number, total: number) =>
    `${counts.rounds(rounds)} · ${counts.exercises(exercises)} · ${done}\u00a0з\u00a0${total} підходів`,
  emptyFiltered: 'За цим фільтром тренувань немає.',
  more: 'Показати ще',
  note: 'Історія відкривається на будь-якому пристрої після входу через Google.',
};

// §23: signing in with Google. The texts do not guess the gender of the person: «Вхід виконано», not «Ти ввійшов».
export const signInTexts = {
  // «Sign in with Google» as the rules of Google put it, in the language of the site.
  button: 'Увійти через Google',
  embedded:
    'Схоже, сайт відкрито всередині іншого застосунку, а там Google може не дозволити вхід. Відкрий сайт у Safari чи Chrome: у меню застосунку обери «Відкрити в браузері».',
  // §23.1: the game needs an account, so every screen of it shows the way in until the person signs in.
  title: 'Увійди, щоб грати',
  lead: 'Козак, його слава й бої зберігаються в обліковому записі Google, тож гра відкривається на будь-якому пристрої.',
  unavailable: 'Вхід зараз недоступний, тож грати не вийде. Спробуй трохи згодом.',
  privacy: 'Які дані ми зберігаємо',
  // The toast of a sign-in that went well: its title, and what it gives under it.
  doneTitle: 'Вхід виконано',
  doneText: 'Козак і його бої тепер відкриваються на будь-якому пристрої.',
  cancelled: 'Вхід скасовано. Щоб грати, увійди через Google.',
  failed: 'Не вдалося увійти через Google. Спробуй ще раз трохи згодом.',
  close: 'Закрити',
};

export const accountTexts = {
  intro:
    'Козак, його бої, власні вправи й налаштування зберігаються в обліковому записі й відкриваються на будь-якому пристрої після входу через Google.',
  accountTitle: 'Обліковий запис Google',
  signOut: 'Вийти',
  signOutTitle: 'Вийти з облікового запису?',
  signOutUnsent: (count: number) =>
    `${counts.workouts(count)} ще не надіслано на сервер. Вони зачекають у цьому браузері й надішлються, коли ти знову ввійдеш тут.`,
  signedOut: 'Вихід виконано: дані облікового запису в цьому браузері більше не видно.',
  deleteTitle: 'Видалити дані',
  deleteText: 'Історія, власні вправи, налаштування й сам обліковий запис зникнуть назавжди.',
  delete: 'Видалити всі дані',
  deleteQuestion: 'Видалити всі дані?',
  deleteWarning: 'Обліковий запис, історію, власні вправи й налаштування не вдасться відновити.',
  deleteConfirm: 'Видалити назавжди',
  deleted: 'Обліковий запис і всі його дані видалено.',
};
