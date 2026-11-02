import type { ExerciseErrorCode } from '../domain/catalog/exercise';
import {
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
import type { ConfigErrorCode } from '../domain/config/validation';
import type { StorageErrorCode } from '../storage/errors';

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
