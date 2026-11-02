import { useId } from 'react';
import { LADDER_MAX, OPPONENT_BOUND_MAX, OPPONENT_BOUND_MIN, ROUNDS_MAX, ROUNDS_MIN } from '../../domain/config/limits';
import type { Difficulty, WinRule } from '../../domain/config/types';
import type { ConfigError, ConfigErrorCode } from '../../domain/config/validation';
import { ladderSequence } from '../../domain/engine/ladder';
import { levelRange } from '../../domain/engine/opponents';
import { difficultyTexts, ruleTexts, setupTexts } from '../../i18n/uk';
import { NumberField, Stepper } from '../components/fields';
import { targetsOf, type SetupState } from './setup';

// With more exercises a table no longer fits a phone, so each exercise gets its own list (§16.3).
const TABLE_EXERCISES_MAX = 3;

export function isInvalid(
  errors: readonly ConfigError[],
  codes: readonly ConfigErrorCode[],
  exerciseId?: string,
  round?: number,
): boolean {
  return errors.some(
    (error) =>
      codes.includes(error.code) &&
      (exerciseId === undefined || error.exerciseId === exerciseId) &&
      (round === undefined || error.round === undefined || error.round === round),
  );
}

const TARGET_ERRORS: readonly ConfigErrorCode[] = ['target-required', 'target-invalid'];

function Choice<TValue extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: TValue;
  options: readonly { value: TValue; name: string; hint: string }[];
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="setup-section">
      <legend className="setup-section__title">{legend}</legend>
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} className="segmented__option">
            <input
              type="radio"
              name={name}
              className="segmented__input"
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="segmented__name">{option.name}</span>
            <span className="segmented__hint">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RuleField({ value, onChange }: { value: WinRule; onChange: (rule: WinRule) => void }) {
  return (
    <Choice
      name="rule"
      legend={setupTexts.rule}
      value={value}
      options={(['over', 'meet'] as const).map((rule) => ({ value: rule, ...ruleTexts[rule] }))}
      onChange={onChange}
    />
  );
}

export function DifficultyField({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}) {
  return (
    <Choice
      name="difficulty"
      legend={setupTexts.difficulty}
      value={value}
      options={(['easy', 'medium', 'hard'] as const).map((level) => ({
        value: level,
        ...difficultyTexts[level],
      }))}
      onChange={onChange}
    />
  );
}

export function RoundsField({ value, onChange }: { value: number; onChange: (rounds: number) => void }) {
  const titleId = useId();

  return (
    <section className="setup-section setup-section--row">
      <div>
        <h2 id={titleId} className="setup-section__title">
          {setupTexts.rounds}
        </h2>
        <p className="hint">{setupTexts.roundsHint}</p>
      </div>
      <Stepper
        value={value}
        min={ROUNDS_MIN}
        max={ROUNDS_MAX}
        labelledBy={titleId}
        decreaseLabel={setupTexts.fewerRounds}
        increaseLabel={setupTexts.moreRounds}
        onChange={onChange}
      />
    </section>
  );
}

// §6.4: the first round fills the rounds nobody has changed; a dot marks the ones set by hand.
export function TargetGrid({
  setup,
  errors,
  onTarget,
  onFill,
}: {
  setup: SetupState;
  errors: readonly ConfigError[];
  onTarget: (exerciseId: string, round: number, value: number | null) => void;
  onFill: (exerciseId: string) => void;
}) {
  const titleId = useId();
  const { exercises, rounds } = setup;

  if (exercises.length === 0) {
    return null;
  }
  const cell = (exerciseId: string, name: string, round: number) => {
    const target = targetsOf(setup, exerciseId)[round];

    return (
      <span className="target-cell">
        <NumberField
          value={target?.value ?? null}
          aria-label={setupTexts.cell(name, round + 1) + (target?.manual ? `, ${setupTexts.manual}` : '')}
          invalid={isInvalid(errors, TARGET_ERRORS, exerciseId, round)}
          onChange={(value) => onTarget(exerciseId, round, value)}
        />
        <span className="target-cell__mark" aria-hidden="true">
          {target?.manual ? '●' : ''}
        </span>
      </span>
    );
  };
  const fill = (exerciseId: string, name: string) => (
    <button
      type="button"
      className="button button--quiet"
      aria-label={setupTexts.fillLabel(name)}
      onClick={() => onFill(exerciseId)}
    >
      {setupTexts.fill}
    </button>
  );
  const roundNumbers = Array.from({ length: rounds }, (_, round) => round);

  return (
    <section className="setup-section" aria-labelledby={titleId}>
      <div className="setup-section__head">
        <h2 id={titleId} className="setup-section__title">
          {setupTexts.targets}
        </h2>
        <p className="hint" aria-hidden="true">
          ● {setupTexts.manual}
        </p>
      </div>
      {exercises.length <= TABLE_EXERCISES_MAX ? (
        <div className="targets">
          <table className="targets__table">
            <thead>
              <tr>
                <th scope="col" className="targets__round">
                  {setupTexts.round}
                </th>
                {exercises.map(({ id, name }) => (
                  <th key={id} scope="col">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roundNumbers.map((round) => (
                <tr key={round}>
                  <th scope="row" className="targets__round">
                    {round + 1}
                  </th>
                  {exercises.map(({ id, name }) => (
                    <td key={id}>{cell(id, name, round)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                {exercises.map(({ id, name }) => (
                  <td key={id}>{fill(id, name)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="target-groups">
          {exercises.map(({ id, name }, index) => {
            const filled = targetsOf(setup, id).filter(({ value }) => value !== null).length;

            return (
              <details key={id} className="target-group" open={index === 0}>
                <summary className="target-group__summary">
                  <span className="target-group__name">{name}</span>
                  <span className="hint">{setupTexts.filled(filled, rounds)}</span>
                </summary>
                <ol className="target-group__rounds" role="list">
                  {roundNumbers.map((round) => (
                    <li key={round} className="target-group__round">
                      <span className="target-group__label" aria-hidden="true">
                        {setupTexts.roundNumber(round + 1)}
                      </span>
                      {cell(id, name, round)}
                    </li>
                  ))}
                </ol>
                {fill(id, name)}
              </details>
            );
          })}
        </div>
      )}
      <p className="hint">{setupTexts.targetsNote}</p>
    </section>
  );
}

const RANGE_ERRORS: readonly ConfigErrorCode[] = [
  'opponent-range-required',
  'opponent-bound-invalid',
  'opponent-range-inverted',
];

// §7.2: the opponent of each exercise rolls a result between two bounds.
export function OpponentRanges({
  setup,
  errors,
  onRange,
}: {
  setup: SetupState;
  errors: readonly ConfigError[];
  onRange: (exerciseId: string, bound: 'min' | 'max', value: number | null) => void;
}) {
  const titleId = useId();

  if (setup.exercises.length === 0) {
    return null;
  }

  return (
    <section className="setup-section" aria-labelledby={titleId}>
      <div className="setup-section__head">
        <h2 id={titleId} className="setup-section__title">
          {setupTexts.opponent}
        </h2>
        <p className="hint">{setupTexts.opponentHint}</p>
      </div>
      <ul className="bounds" role="list">
        {setup.exercises.map(({ id, name }) => {
          const range = setup.ranges[id] ?? { min: null, max: null };
          const invalid = isInvalid(errors, RANGE_ERRORS, id);

          return (
            <li key={id} className="bounds__row">
              <span className="bounds__name" aria-hidden="true">
                {name}
              </span>
              {(['min', 'max'] as const).map((bound) => (
                <span key={bound} className="bounds__field">
                  <span aria-hidden="true">{bound === 'min' ? setupTexts.min : setupTexts.max}</span>
                  <NumberField
                    className="input input--number input--short"
                    aria-label={`${setupTexts.rangeLabel(name)} ${bound === 'min' ? setupTexts.min : setupTexts.max}`}
                    value={range[bound]}
                    invalid={invalid}
                    onChange={(value) => onRange(id, bound, value)}
                  />
                </span>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function isBound(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= OPPONENT_BOUND_MIN && value <= OPPONENT_BOUND_MAX;
}

// §8.2: one upper bound M per exercise; the difficulty takes its share of it.
export function UpperBounds({
  setup,
  errors,
  onBound,
}: {
  setup: SetupState;
  errors: readonly ConfigError[];
  onBound: (exerciseId: string, value: number | null) => void;
}) {
  const titleId = useId();

  if (setup.exercises.length === 0) {
    return null;
  }

  return (
    <section className="setup-section" aria-labelledby={titleId}>
      <div className="setup-section__head">
        <h2 id={titleId} className="setup-section__title">
          {setupTexts.upperBound}
        </h2>
        <p className="hint">{setupTexts.opponentHint}</p>
      </div>
      <ul className="bounds" role="list">
        {setup.exercises.map(({ id, name }) => {
          const bound = setup.bounds[id] ?? null;
          const range = isBound(bound) ? levelRange(bound, setup.difficulty) : null;

          return (
            <li key={id} className="bounds__row">
              <span className="bounds__field bounds__field--named">
                <span className="bounds__name" aria-hidden="true">
                  {name}
                </span>
                <NumberField
                  aria-label={name + setupTexts.upperBoundSuffix}
                  className="input input--number input--short"
                  value={bound}
                  invalid={isInvalid(errors, ['upper-bound-required', 'upper-bound-invalid'], id)}
                  onChange={(value) => onBound(id, value)}
                />
              </span>
              <span className="hint bounds__range">
                {range === null ? '' : setupTexts.levelRange(range.min, range.max)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// §11.4: the top of the ladder and the way back down.
export function LadderFields({
  setup,
  errors,
  onMax,
  onReturnDown,
}: {
  setup: SetupState;
  errors: readonly ConfigError[];
  onMax: (value: number | null) => void;
  onReturnDown: (value: boolean) => void;
}) {
  const maxId = useId();
  const { ladderMax, returnDown } = setup;
  const valid = ladderMax !== null && Number.isInteger(ladderMax) && ladderMax >= 1 && ladderMax <= LADDER_MAX;

  return (
    <section className="setup-section">
      <div className="setup-section--row">
        <div>
          <label htmlFor={maxId} className="setup-section__title">
            {setupTexts.ladderMax}
          </label>
          <p className="hint">{setupTexts.ladderMaxHint}</p>
        </div>
        <NumberField
          id={maxId}
          className="input input--number input--short"
          value={ladderMax}
          invalid={isInvalid(errors, ['ladder-max-required', 'ladder-max-invalid'])}
          onChange={onMax}
        />
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          className="checkbox__input"
          checked={returnDown}
          onChange={(event) => onReturnDown(event.target.checked)}
        />
        {setupTexts.returnDown}
      </label>
      {valid && <p className="hint">{setupTexts.ladderStages(ladderSequence(ladderMax, returnDown))}</p>}
    </section>
  );
}
