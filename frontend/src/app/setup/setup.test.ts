import { describe, expect, it } from 'vitest';
import { EXERCISES_MAX } from '../../domain/config/limits';
import { validateConfig } from '../../domain/config/validation';
import {
  ladderConfig,
  opponentLevelsConfig,
  pullUps,
  pushUps,
  randomOpponentConfig,
  squats,
  targetConfig,
} from '../../domain/testing/fixtures';
import {
  addExercise,
  emptySetup,
  fillTargets,
  removeExercise,
  renameExercise,
  restoreSetup,
  setRounds,
  setTarget,
  targetsOf,
  toDraft,
} from './setup';

const CATALOG = [pushUps, squats, pullUps];

describe('setup of a workout', () => {
  it('starts with «Перевиконати», 5 rounds and no exercises (§4.2, §4.4)', () => {
    const draft = toDraft(emptySetup('target'));

    expect(draft).toEqual({ mode: 'target', rule: 'over', rounds: 5, exercises: [] });
  });

  it.each([targetConfig(), randomOpponentConfig(), opponentLevelsConfig(), ladderConfig()])(
    'gives back the saved configuration of %s',
    (config) => {
      expect(validateConfig(toDraft(restoreSetup(config.mode, config, CATALOG)))).toEqual({
        ok: true,
        config,
      });
    },
  );

  it('drops exercises that left the catalog and renames the others', () => {
    const setup = restoreSetup('target', targetConfig(), [{ id: squats.id, name: 'Присід' }]);

    expect(setup.exercises).toEqual([{ id: squats.id, name: 'Присід' }]);
  });

  it('ignores the configuration of another mode', () => {
    expect(restoreSetup('ladder', targetConfig(), CATALOG)).toEqual(emptySetup('ladder'));
  });

  it('marks saved rounds that differ from the first as set by hand', () => {
    const setup = restoreSetup('target', targetConfig({ rounds: 3, exercises: [{ ...pushUps, targets: [10, 12, 10] }] }), CATALOG);

    expect(targetsOf(setup, pushUps.id).map(({ manual }) => manual)).toEqual([false, true, false]);
  });

  it('adds an exercise once and up to the limit', () => {
    const many = Array.from({ length: EXERCISES_MAX + 1 }, (_, index) => ({ id: `e${index}`, name: `Вправа ${index}` }));
    const full = many.reduce(addExercise, emptySetup('random-opponent'));

    expect(full.exercises).toHaveLength(EXERCISES_MAX);
    expect(addExercise(addExercise(emptySetup('target'), pushUps), pushUps).exercises).toEqual([pushUps]);
  });

  it('keeps a single exercise for the ladder', () => {
    const setup = addExercise(addExercise(emptySetup('ladder'), pushUps), pullUps);

    expect(setup.exercises).toEqual([pullUps]);
  });

  it('keeps the targets of a removed exercise for the rest of the setup', () => {
    const filled = setTarget(addExercise(emptySetup('target'), pushUps), pushUps.id, 0, 15);
    const back = addExercise(removeExercise(filled, pushUps.id), pushUps);

    expect(targetsOf(back, pushUps.id)[0]?.value).toBe(15);
  });

  it('copies the first round into new rounds and keeps rounds that were set by hand', () => {
    let setup = setRounds(addExercise(emptySetup('target'), pushUps), 2);
    setup = setTarget(setup, pushUps.id, 1, 30);
    setup = setTarget(setup, pushUps.id, 0, 20);
    setup = setRounds(setup, 3);

    expect(targetsOf(setup, pushUps.id).map(({ value }) => value)).toEqual([20, 30, 20]);
    expect(targetsOf(fillTargets(setup, pushUps.id), pushUps.id).map(({ value }) => value)).toEqual([20, 20, 20]);
  });

  it('keeps targets of rounds removed by mistake until the start', () => {
    let setup = setTarget(setRounds(addExercise(emptySetup('target'), pushUps), 3), pushUps.id, 2, 40);
    setup = setRounds(setRounds(setup, 2), 3);

    expect(targetsOf(setup, pushUps.id)[2]).toEqual({ value: 40, manual: true });
  });

  it('keeps the place and the values of a renamed exercise', () => {
    const setup = renameExercise(addExercise(addExercise(emptySetup('ladder'), squats), pushUps), {
      id: pushUps.id,
      name: 'Віджимання на кулаках',
    });

    expect(setup.exercises).toEqual([{ id: pushUps.id, name: 'Віджимання на кулаках' }]);
  });

  it('puts into an attempt only the id and the name of a custom exercise (§5.3)', () => {
    const custom = { id: 'c1', name: 'Бурпі', description: 'Зі стрибком' };
    const draft = toDraft(addExercise(emptySetup('ladder'), custom));

    expect(draft).toMatchObject({ exercise: { id: 'c1', name: 'Бурпі' } });
    expect(JSON.stringify(draft)).not.toContain('Зі стрибком');
  });
});
