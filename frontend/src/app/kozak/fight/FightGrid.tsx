import { useState, type CSSProperties } from 'react';
import {
  addRound,
  canAddExercise,
  canAddRound,
  canRemoveRound,
  gridTotals,
  removeExercise,
  removeRound,
  setReps,
  type FightGrid as Grid,
} from '../../../domain/config/grid';
import { SET_REPS_MAX, SET_REPS_MIN } from '../../../domain/config/limits';
import { fightHallTexts } from '../../../i18n/kozak';
import { KozakIcon } from '../parts';

/**
 * resesign/Main.dc.html: the exercises in the rows, the rounds in the columns and the repetitions
 * of a set in every cell, with the sums of every exercise on the right and of every round below.
 * A phone scrolls the rounds sideways while the exercises stay in place.
 */
export function FightGrid({ grid, onChange, onAdd }: { grid: Grid; onChange: (grid: Grid) => void; onAdd: () => void }) {
  const totals = gridTotals(grid);
  const rounds = Array.from({ length: grid.rounds }, (_, round) => round);

  return (
    <section className="k-grid" aria-label={fightHallTexts.grid}>
      <div className="k-grid__scroll">
        <div className="k-grid__table" style={{ '--rounds': grid.rounds } as CSSProperties}>
          <div className="k-grid__row k-grid__row--head">
            <span className="k-grid__corner">{fightHallTexts.exercise}</span>
            {rounds.map((round) => (
              <div key={round} className="k-grid__round">
                <span aria-hidden="true">{fightHallTexts.round(round + 1)}</span>
                <span className="visually-hidden">{fightHallTexts.roundName(round + 1)}</span>
                {canRemoveRound(grid) && (
                  <button
                    type="button"
                    className="k-grid__remove"
                    aria-label={fightHallTexts.removeRound(round + 1)}
                    onClick={() => onChange(removeRound(grid, round))}
                  >
                    <KozakIcon name="close" className="k-grid__remove-icon" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="k-grid__add"
              aria-label={fightHallTexts.addRound}
              disabled={!canAddRound(grid)}
              onClick={() => onChange(addRound(grid))}
            >
              <KozakIcon name="plus" className="k-grid__add-icon" />
            </button>
          </div>
          {grid.exercises.map((exercise, row) => (
            <div key={exercise.id} className="k-grid__row">
              <div className="k-grid__exercise">
                <span className="k-grid__index" aria-hidden="true">
                  {String(row + 1).padStart(2, '0')}
                </span>
                <span className="k-grid__name">{exercise.name}</span>
                <button
                  type="button"
                  className="k-grid__remove"
                  aria-label={fightHallTexts.removeExercise(exercise.name)}
                  onClick={() => onChange(removeExercise(grid, exercise.id))}
                >
                  <KozakIcon name="close" className="k-grid__remove-icon" />
                </button>
              </div>
              {exercise.sets.map((reps, round) => (
                <Cell
                  key={round}
                  exercise={exercise.name}
                  round={round + 1}
                  reps={reps}
                  onChange={(value) => onChange(setReps(grid, exercise.id, round, value))}
                />
              ))}
              <p className="k-grid__total">
                <span className="visually-hidden">{fightHallTexts.exerciseTotal(exercise.name)}: </span>
                {totals.exercises[row]}
              </p>
            </div>
          ))}
          <div className="k-grid__row k-grid__row--foot">
            <button type="button" className="k-grid__add k-grid__add--exercise" disabled={!canAddExercise(grid)} onClick={onAdd}>
              <KozakIcon name="plus" className="k-grid__add-icon" />
              {fightHallTexts.addExercise}
            </button>
            {totals.rounds.map((total, round) => (
              <p key={round} className="k-grid__total">
                <span aria-hidden="true">Σ </span>
                <span className="visually-hidden">{fightHallTexts.roundTotal(round + 1)}: </span>
                {total}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// A cell takes its repetitions by «−» and «+» or by a number typed in; it stays within the limits.
function Cell({
  exercise,
  round,
  reps,
  onChange,
}: {
  exercise: string;
  round: number;
  reps: number;
  onChange: (reps: number) => void;
}) {
  // What the player is typing, until the field is left.
  const [typing, setTyping] = useState<string | null>(null);

  const commit = () => {
    if (typing !== null && typing !== '') {
      onChange(Number(typing));
    }
    setTyping(null);
  };

  return (
    <div className="k-cell">
      <button
        type="button"
        className="k-cell__step"
        aria-label={fightHallTexts.less(exercise, round)}
        disabled={reps <= SET_REPS_MIN}
        onClick={() => onChange(reps - 1)}
      >
        −
      </button>
      <label className="k-cell__value">
        <input
          className="k-cell__input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={fightHallTexts.cell(exercise, round)}
          value={typing ?? String(reps)}
          onChange={(event) => setTyping(event.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
            }
          }}
        />
        <span className="k-cell__unit" aria-hidden="true">
          {fightHallTexts.reps}
        </span>
      </label>
      <button
        type="button"
        className="k-cell__step"
        aria-label={fightHallTexts.more(exercise, round)}
        disabled={reps >= SET_REPS_MAX}
        onClick={() => onChange(reps + 1)}
      >
        +
      </button>
    </div>
  );
}
