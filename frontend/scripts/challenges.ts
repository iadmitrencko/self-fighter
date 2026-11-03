import type { WinRule, WorkoutConfig } from '../src/domain/config/types';
import { validateConfig } from '../src/domain/config/validation';
import { ladderSequence } from '../src/domain/engine/ladder';
import { plural } from '../src/i18n/plural';

/**
 * Expands the matrix of ready-made challenges (backend/content/challenges/matrix.yaml) into the
 * pages of the catalog (section 6.2 of the plan). Every configuration is built and checked by the
 * rules of the game, so a page and the game cannot disagree.
 */

export type Level = 'easy' | 'medium' | 'hard';
export type Demand = 'verified' | 'navigation' | 'unverified';

// One, few and many: «1 віджимання», «2 віджимання», «5 віджимань».
export type Forms = readonly [string, string, string];

export interface ExerciseInfo {
  readonly slug: string;
  readonly name: string;
  readonly forms: Forms;
}

export type Program =
  | { readonly kind: 'rounds'; readonly exercises: readonly string[]; readonly rounds: readonly (readonly number[])[] }
  | { readonly kind: 'ladder'; readonly stages: readonly number[] };

export interface GeneratedChallenge {
  readonly slug: string;
  readonly mode: WorkoutConfig['mode'];
  readonly exercises: readonly string[];
  readonly level: Level;
  readonly demand: Demand;
  readonly title: string;
  readonly description: string;
  readonly heading: string;
  readonly lead: string;
  readonly config: WorkoutConfig;
  readonly program: Program;
  readonly stages: number;
  readonly totalReps: number;
  readonly easier: string | null;
  readonly harder: string | null;
  readonly related: readonly string[];
  readonly position: number;
  readonly updated: string;
}

const LEVELS = ['easy', 'medium', 'hard'] as const;
const DEMANDS = ['verified', 'navigation', 'unverified'] as const;
const RULES = ['meet', 'over'] as const;
const TEXTS = ['slug', 'heading', 'title', 'description', 'lead'] as const;
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;
// Neighbours of a family differ by a quarter of the volume: 100 and 105 push-ups are one page (§21.4).
const STEP_MIN = 1.25;
const RELATED_MAX = 3;

type Texts = Readonly<Record<(typeof TEXTS)[number], string>>;

interface Limits {
  readonly set: number;
  readonly total: number;
}

interface Draft {
  readonly family: number;
  readonly level: Level;
  readonly demand: Demand;
  readonly texts: Texts;
  readonly values: Readonly<Record<string, string>>;
  readonly config: WorkoutConfig;
  readonly program: Program;
}

// A value of the matrix with its place in it, so a mistake names the line to fix.
interface Field {
  readonly where: string;
  readonly value: unknown;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(field: Field, expected: string): never {
  throw new Error(`${field.where} must be ${expected}.`);
}

function at(field: Field, key: string): Field {
  return { where: `${field.where}.${key}`, value: isRecord(field.value) ? field.value[key] : undefined };
}

function list(field: Field): Field[] {
  if (!Array.isArray(field.value) || field.value.length === 0) {
    fail(field, 'a non-empty list');
  }

  return field.value.map((value: unknown, index) => ({ where: `${field.where}[${index}]`, value }));
}

function text(field: Field): string {
  if (typeof field.value !== 'string' || field.value.trim() === '') {
    fail(field, 'a text');
  }

  return field.value;
}

function count(field: Field): number {
  if (typeof field.value !== 'number' || !Number.isInteger(field.value) || field.value < 1) {
    fail(field, 'a positive whole number');
  }

  return field.value;
}

function oneOf<T extends string>(field: Field, options: readonly T[], fallback?: T): T {
  const value = field.value ?? fallback;
  const option = options.find((item) => item === value);

  return option ?? fail(field, `one of ${options.join(', ')}`);
}

function flag(field: Field): boolean {
  const value = field.value ?? false;

  return typeof value === 'boolean' ? value : fail(field, 'true or false');
}

function forms(field: Field): Forms {
  const [one, few, many, ...rest] = list(field).map(text);

  return one !== undefined && few !== undefined && many !== undefined && rest.length === 0
    ? [one, few, many]
    : fail(field, 'three forms: one, few, many');
}

function amount(value: number, [one, few, many]: Forms): string {
  return plural(value, { one: `{n} ${one}`, few: `{n} ${few}`, many: `{n} ${many}` });
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function fill(template: string, values: Readonly<Record<string, string>>, where: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];

    if (value === undefined) {
      throw new Error(`${where} uses {${key}}, which this kind of challenge does not have.`);
    }

    return value;
  });
}

function volume({ program }: Draft): number {
  return program.kind === 'ladder' ? sum(program.stages) : sum(program.rounds.flat());
}

function exercisesOf(config: WorkoutConfig): string[] {
  return config.mode === 'ladder' ? [config.exercise.id] : config.exercises.map(({ id }) => id);
}

export function generateChallenges(source: unknown, catalog: readonly ExerciseInfo[]): GeneratedChallenge[] {
  const matrix: Field = { where: 'matrix', value: source };
  const updated = text(at(matrix, 'updated'));
  const units = at(matrix, 'units');
  const roundForms = forms(at(units, 'rounds'));
  const stageForms = forms(at(units, 'stages'));
  const repForms = forms(at(units, 'reps'));

  const exercise = (field: Field): ExerciseInfo & { readonly limits: Limits } => {
    const slug = text(field);
    const info = catalog.find((item) => item.slug === slug) ?? fail(field, 'an exercise of backend/content/exercises');
    const limits = at(at(matrix, 'limits'), slug);

    return { ...info, limits: { set: count(at(limits, 'set')), total: count(at(limits, 'total')) } };
  };

  // The program may not ask for more than a person does in one set or in one workout.
  const checkLimits = (field: Field, { name, limits }: ReturnType<typeof exercise>, set: number, total: number) => {
    if (set > limits.set || total > limits.total) {
      throw new Error(`${field.where} asks for ${set} ${name} in a set and ${total} in all, the limits are ${limits.set} and ${limits.total}.`);
    }
  };

  const drafts = list(at(matrix, 'families')).flatMap((family, index): Draft[] => {
    const kind = oneOf(at(family, 'kind'), ['total', 'ladder', 'circuit'] as const);
    const rule: WinRule = oneOf(at(family, 'rule'), RULES, 'meet');
    const templateName = at(family, 'template');
    const template = at(at(matrix, 'templates'), text(templateName));
    const common = {
      family: index,
      demand: oneOf(at(family, 'demand'), DEMANDS, 'unverified'),
      texts: Object.fromEntries(TEXTS.map((key) => [key, text(at(template, key))])) as Texts,
    };
    const variants = list(at(family, 'variants'));

    if (kind === 'total') {
      const info = exercise(at(family, 'exercise'));

      return variants.map((variant) => {
        const total = count(at(variant, 'total'));
        const rounds = count(at(variant, 'rounds'));
        const perRound = total / rounds;

        if (!Number.isInteger(perRound)) {
          fail(at(variant, 'total'), `a number that splits into ${rounds} equal rounds`);
        }
        checkLimits(variant, info, perRound, total);
        const targets = Array.from({ length: rounds }, () => perRound);

        return {
          ...common,
          level: oneOf(at(variant, 'level'), LEVELS),
          values: {
            exercise: info.slug,
            genitive: info.forms[2],
            total: String(total),
            reps: amount(total, info.forms),
            rounds: amount(rounds, roundForms),
            perRound: amount(perRound, info.forms),
            perRoundNumber: String(perRound),
          },
          config: { mode: 'target', rule, rounds, exercises: [{ id: info.slug, name: info.name, targets }] },
          program: { kind: 'rounds', exercises: [info.name], rounds: targets.map((target) => [target]) },
        };
      });
    }

    if (kind === 'ladder') {
      const info = exercise(at(family, 'exercise'));
      const returnDown = flag(at(family, 'returnDown'));

      return variants.map((variant) => {
        const top = count(at(variant, 'top'));
        const stages = ladderSequence(top, returnDown);
        checkLimits(variant, info, top, sum(stages));

        return {
          ...common,
          level: oneOf(at(variant, 'level'), LEVELS),
          values: {
            exercise: info.slug,
            genitive: info.forms[2],
            top: String(top),
            stages: amount(stages.length, stageForms),
            reps: amount(sum(stages), info.forms),
          },
          config: { mode: 'ladder', rule, exercise: { id: info.slug, name: info.name }, max: top, returnDown },
          program: { kind: 'ladder', stages },
        };
      });
    }

    const exercises = list(at(family, 'exercises')).map(exercise);

    return variants.map((variant) => {
      const rounds = count(at(variant, 'rounds'));
      const level = oneOf(at(variant, 'level'), LEVELS);
      const targets = exercises.map((info) => count(at(at(variant, 'targets'), info.slug)));
      exercises.forEach((info, place) => checkLimits(variant, info, targets[place] ?? 0, (targets[place] ?? 0) * rounds));

      return {
        ...common,
        level,
        values: {
          level,
          levelName: text(at(at(matrix, 'levels'), level)),
          rounds: amount(rounds, roundForms),
          stages: amount(rounds * exercises.length, stageForms),
          reps: amount(rounds * sum(targets), repForms),
        },
        config: {
          mode: 'target',
          rule,
          rounds,
          exercises: exercises.map((info, place) => ({
            id: info.slug,
            name: info.name,
            targets: Array.from({ length: rounds }, () => targets[place] ?? 0),
          })),
        },
        program: {
          kind: 'rounds',
          exercises: exercises.map(({ name }) => name),
          rounds: Array.from({ length: rounds }, () => targets),
        },
      };
    });
  });

  const slugs = drafts.map(({ texts, values }, index) => fill(texts.slug, values, `challenge ${index + 1}`));
  const family = (draft: Draft) => drafts.filter((other) => other.family === draft.family);

  return drafts.map((draft, index) => {
    const slug = slugs[index] ?? '';
    const where = `challenge "${slug}"`;
    const text = (key: (typeof TEXTS)[number]) => fill(draft.texts[key], draft.values, `${where} ${key}`);
    const validation = validateConfig(draft.config);

    if (!validation.ok) {
      throw new Error(`${where} breaks the rules of the game: ${validation.errors.map(({ code }) => code).join(', ')}.`);
    }
    if (slugs.indexOf(slug) !== index) {
      throw new Error(`${where} is generated twice.`);
    }
    const title = text('title');
    const description = text('description');

    if (title.length > TITLE_MAX || description.length > DESCRIPTION_MAX) {
      throw new Error(`${where}: the title takes ${title.length} of ${TITLE_MAX} characters, the description ${description.length} of ${DESCRIPTION_MAX}.`);
    }
    const siblings = family(draft);
    const place = siblings.indexOf(draft);
    const previous = siblings[place - 1];
    const next = siblings[place + 1];

    if (previous !== undefined && (volume(draft) < volume(previous) * STEP_MIN || LEVELS.indexOf(draft.level) < LEVELS.indexOf(previous.level))) {
      throw new Error(`${where} is too close to "${slugs[drafts.indexOf(previous)]}": take ${Math.ceil(volume(previous) * STEP_MIN)} repetitions or more, at the same level or higher.`);
    }
    const own = exercisesOf(draft.config);
    // Challenges of other families with the same exercises, the same level first.
    const related = drafts
      .filter((other) => other.family !== draft.family && exercisesOf(other.config).some((id) => own.includes(id)))
      .sort((a, b) => Number(b.level === draft.level) - Number(a.level === draft.level) || drafts.indexOf(a) - drafts.indexOf(b))
      .slice(0, RELATED_MAX)
      .map((other) => slugs[drafts.indexOf(other)] ?? '');

    return {
      slug,
      mode: draft.config.mode,
      exercises: own,
      level: draft.level,
      demand: draft.demand,
      title,
      description,
      heading: text('heading'),
      lead: text('lead'),
      config: draft.config,
      program: draft.program,
      stages: draft.program.kind === 'ladder' ? draft.program.stages.length : sum(draft.program.rounds.map((round) => round.length)),
      totalReps: volume(draft),
      easier: previous === undefined ? null : (slugs[drafts.indexOf(previous)] ?? null),
      harder: next === undefined ? null : (slugs[drafts.indexOf(next)] ?? null),
      related,
      position: index + 1,
      updated,
    };
  });
}
