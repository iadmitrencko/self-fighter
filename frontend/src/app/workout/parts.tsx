import { useId, type CSSProperties, type Ref } from 'react';
import { REPS_MAX } from '../../domain/config/limits';
import { parseReps } from '../../domain/config/validation';
import { fightTexts } from '../../i18n/uk';
import { Icon } from '../components/Icon';

// §12.2: whole numbers from 0; an empty field cannot be confirmed.
export function RepsField({
  text,
  error,
  locked,
  inputRef,
  onChange,
}: {
  text: string;
  error: boolean;
  locked: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (text: string) => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const bump = (delta: number) => {
    const value = parseReps(text) ?? 0;

    onChange(String(Math.min(REPS_MAX, Math.max(0, value + delta))));
  };

  return (
    <div className="reps">
      <label htmlFor={inputId} className="reps__label">
        {fightTexts.reps}
      </label>
      <div className="reps__control">
        <button
          type="button"
          className="reps__step"
          aria-label={fightTexts.fewer}
          disabled={locked}
          onClick={() => bump(-1)}
        >
          <Icon name="minus" />
        </button>
        <input
          ref={inputRef}
          id={inputId}
          className="reps__input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          readOnly={locked}
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="reps__step"
          aria-label={fightTexts.more}
          disabled={locked}
          onClick={() => bump(1)}
        >
          <Icon name="plus" />
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {fightTexts.repsError}
        </p>
      )}
    </div>
  );
}

// A segment per stage while they fit, a solid bar for long fights (section 9 of the plan).
const SEGMENTS_MAX = 40;

export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const current = Math.min(done + 1, total);

  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={fightTexts.progress}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={label}
    >
      {total <= SEGMENTS_MAX ? (
        <div className="progress__segments" style={{ '--count': total } as CSSProperties}>
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={
                index < done
                  ? 'progress__segment progress__segment--done'
                  : index === current - 1
                    ? 'progress__segment progress__segment--current'
                    : 'progress__segment'
              }
            />
          ))}
        </div>
      ) : (
        <div className="progress__bar">
          <span className="progress__fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export function InterruptButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="button button--outline fight-head__stop" onClick={onClick}>
      <Icon name="close" className="button__icon" />
      {fightTexts.interrupt}
    </button>
  );
}
