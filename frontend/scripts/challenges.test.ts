import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { validateConfig } from '../src/domain/config/validation';
import { generateChallenges, type ExerciseInfo } from './challenges';
import { readExercises } from './exercises';

// Not new URL(…, import.meta.url): Vite would take it for an asset to bundle.
const content = (path: string) => join(dirname(fileURLToPath(import.meta.url)), '../../backend/content', path);

const EXERCISES: ExerciseInfo[] = [
  { slug: 'push-ups', name: 'Віджимання', forms: ['віджимання', 'віджимання', 'віджимань'] },
  { slug: 'squats', name: 'Присідання', forms: ['присідання', 'присідання', 'присідань'] },
];

function matrix(families: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    updated: '2026-11-03',
    limits: { 'push-ups': { set: 40, total: 300 }, squats: { set: 60, total: 500 } },
    units: {
      rounds: ['раунд', 'раунди', 'раундів'],
      stages: ['етап', 'етапи', 'етапів'],
      reps: ['повторення', 'повторення', 'повторень'],
    },
    levels: { easy: 'легкий', medium: 'середній', hard: 'складний' },
    templates: {
      total: {
        slug: '{total}-{exercise}',
        heading: '{reps}',
        title: '{reps}: {rounds} по {perRoundNumber}',
        description: '{reps} за тренування.',
        lead: '{rounds} по {perRound}.',
      },
      ladder: {
        slug: '{exercise}-ladder-to-{top}',
        heading: 'Драбина {genitive} до {top}',
        title: 'Драбина {genitive} до {top}: {stages}',
        description: 'Разом {reps}.',
        lead: '{stages}.',
      },
      circuit: {
        slug: 'circuit-{level}',
        heading: 'Коло: {levelName} рівень',
        title: 'Коло: {levelName} рівень',
        description: '{rounds}, {stages}, {reps}.',
        lead: '{rounds}.',
      },
    },
    families,
    ...overrides,
  };
}

const pushUpTotals = (...variants: unknown[]) => ({ kind: 'total', template: 'total', exercise: 'push-ups', variants });
const pushUpLadders = (...variants: unknown[]) => ({ kind: 'ladder', template: 'ladder', exercise: 'push-ups', variants });

describe('generator of ready-made challenges', () => {
  // Section 6.6 of the plan: the file in Git is what the generator makes of the matrix.
  it('keeps generated.json in step with the matrix', () => {
    const generated = generateChallenges(
      parse(readFileSync(content('challenges/matrix.yaml'), 'utf8')),
      readExercises(content('exercises')),
    );
    const committed: unknown = JSON.parse(readFileSync(content('challenges/generated.json'), 'utf8'));

    expect(committed, 'Run make challenges after a change of the matrix or of the exercises.').toEqual(generated);
    expect(generated.every(({ config }) => validateConfig(config).ok)).toBe(true);
  });

  it('splits a total into equal rounds', () => {
    const [easy, medium] = generateChallenges(
      matrix([pushUpTotals({ total: 50, rounds: 5, level: 'easy' }, { total: 100, rounds: 10, level: 'medium' })]),
      EXERCISES,
    );

    expect(easy).toEqual({
      slug: '50-push-ups',
      mode: 'target',
      exercises: ['push-ups'],
      level: 'easy',
      demand: 'unverified',
      title: '50 віджимань: 5 раундів по 10',
      description: '50 віджимань за тренування.',
      heading: '50 віджимань',
      lead: '5 раундів по 10 віджимань.',
      config: { mode: 'target', rule: 'meet', rounds: 5, exercises: [{ id: 'push-ups', name: 'Віджимання', targets: [10, 10, 10, 10, 10] }] },
      program: { kind: 'rounds', exercises: ['Віджимання'], rounds: [[10], [10], [10], [10], [10]] },
      stages: 5,
      totalReps: 50,
      easier: null,
      harder: '100-push-ups',
      related: [],
      position: 1,
      updated: '2026-11-03',
    });
    expect(medium).toMatchObject({ slug: '100-push-ups', easier: '50-push-ups', harder: null, position: 2 });
  });

  it('builds a ladder and its way back down by the rules of the game', () => {
    const [ladder] = generateChallenges(
      matrix([{ ...pushUpLadders({ top: 3, level: 'easy' }), returnDown: true, rule: 'over', demand: 'verified' }]),
      EXERCISES,
    );

    expect(ladder).toMatchObject({
      slug: 'push-ups-ladder-to-3',
      mode: 'ladder',
      demand: 'verified',
      title: 'Драбина віджимань до 3: 5 етапів',
      description: 'Разом 9 віджимань.',
      config: { mode: 'ladder', rule: 'over', exercise: { id: 'push-ups', name: 'Віджимання' }, max: 3, returnDown: true },
      program: { kind: 'ladder', stages: [1, 2, 3, 2, 1] },
      stages: 5,
      totalReps: 9,
    });
  });

  it('puts several exercises into each round of a circuit', () => {
    const [circuit] = generateChallenges(
      matrix([
        {
          kind: 'circuit',
          template: 'circuit',
          exercises: ['push-ups', 'squats'],
          variants: [{ rounds: 2, level: 'medium', targets: { 'push-ups': 5, squats: 10 } }],
        },
      ]),
      EXERCISES,
    );

    expect(circuit).toMatchObject({
      slug: 'circuit-medium',
      exercises: ['push-ups', 'squats'],
      title: 'Коло: середній рівень',
      description: '2 раунди, 4 етапи, 30 повторень.',
      config: {
        mode: 'target',
        rounds: 2,
        exercises: [
          { id: 'push-ups', name: 'Віджимання', targets: [5, 5] },
          { id: 'squats', name: 'Присідання', targets: [10, 10] },
        ],
      },
      program: { kind: 'rounds', exercises: ['Віджимання', 'Присідання'], rounds: [[5, 10], [5, 10]] },
      stages: 4,
      totalReps: 30,
    });
  });

  // §21.3: a page links to challenges of other families with the same exercises, its level first.
  it('relates challenges of other families with the same exercises', () => {
    const challenges = generateChallenges(
      matrix([
        pushUpTotals({ total: 50, rounds: 5, level: 'easy' }, { total: 100, rounds: 10, level: 'medium' }),
        pushUpLadders({ top: 5, level: 'easy' }, { top: 10, level: 'medium' }),
        { kind: 'total', template: 'total', exercise: 'squats', variants: [{ total: 100, rounds: 5, level: 'medium' }] },
      ]),
      EXERCISES,
    );

    expect(challenges.find(({ slug }) => slug === '100-push-ups')?.related).toEqual(['push-ups-ladder-to-10', 'push-ups-ladder-to-5']);
    expect(challenges.find(({ slug }) => slug === '100-squats')?.related).toEqual([]);
  });

  it.each([
    ['an unknown exercise', matrix([{ ...pushUpTotals({ total: 50, rounds: 5, level: 'easy' }), exercise: 'burpees' }]), /families\[0\]\.exercise must be an exercise/],
    ['more than the limit of a set', matrix([pushUpTotals({ total: 90, rounds: 2, level: 'easy' })]), /45 Віджимання in a set and 90 in all, the limits are 40 and 300/],
    ['more than the limit of a workout', matrix([pushUpTotals({ total: 400, rounds: 20, level: 'easy' })]), /the limits are 40 and 300/],
    ['neighbours too close', matrix([pushUpTotals({ total: 100, rounds: 10, level: 'easy' }, { total: 110, rounds: 10, level: 'medium' })]), /"110-push-ups" is too close to "100-push-ups": take 125/],
    ['a level going down', matrix([pushUpTotals({ total: 50, rounds: 5, level: 'hard' }, { total: 100, rounds: 10, level: 'easy' })]), /at the same level or higher/],
    ['a total that does not split', matrix([pushUpTotals({ total: 50, rounds: 3, level: 'easy' })]), /total must be a number that splits into 3 equal rounds/],
    ['an unknown value in a text', matrix([pushUpTotals({ total: 50, rounds: 5, level: 'easy' })], { templates: { total: { slug: '{top}', heading: 'a', title: 'a', description: 'a', lead: 'a' } } }), /uses \{top\}/],
    ['the same page twice', matrix([pushUpTotals({ total: 50, rounds: 5, level: 'easy' }), pushUpTotals({ total: 50, rounds: 5, level: 'easy' })]), /"50-push-ups" is generated twice/],
    ['a long title', matrix([{ ...pushUpTotals({ total: 50, rounds: 5, level: 'easy' }), template: 'long' }], { templates: { long: { slug: 'a', heading: 'a', title: 'a'.repeat(61), description: 'a', lead: 'a' } } }), /the title takes 61 of 60 characters/],
    ['an unknown rule', matrix([{ ...pushUpTotals({ total: 50, rounds: 5, level: 'easy' }), rule: 'win' }]), /families\[0\]\.rule must be one of meet, over/],
    ['plural forms missing', matrix([], { units: { rounds: ['раунд'], stages: [], reps: [] } }), /matrix\.units\.rounds must be three forms/],
    ['no families', matrix([]), /matrix\.families must be a non-empty list/],
    ['a configuration the game refuses', matrix([pushUpLadders({ top: 101, level: 'easy' })], { limits: { 'push-ups': { set: 200, total: 9999 } } }), /breaks the rules of the game: ladder-max-invalid/],
  ])('refuses %s', (_, source, error) => {
    expect(() => generateChallenges(source, EXERCISES)).toThrow(error);
  });
});
