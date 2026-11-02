import { useState, type ComponentPropsWithoutRef } from 'react';
import { Icon } from './Icon';

/**
 * Whole numbers only (§4.3). An empty field is null: it is not zero. Any other text is NaN,
 * which the validation of the domain reports as an invalid value instead of guessing a number.
 */
export function parseInteger(text: string): number | null {
  const trimmed = text.trim();

  if (trimmed === '') {
    return null;
  }

  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

function format(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value);
}

type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'>;

// Keeps what the player typed, unless the value changes from outside, as «Заповнити всі» does.
export function NumberField({
  value,
  onChange,
  invalid = false,
  className = 'input input--number',
  ...props
}: InputProps & {
  value: number | null;
  onChange: (value: number | null) => void;
  invalid?: boolean;
}) {
  const [text, setText] = useState(() => format(value));
  const shown = Object.is(parseInteger(text), value) ? text : format(value);

  return (
    <input
      {...props}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseInteger(event.target.value));
      }}
    />
  );
}

export function Stepper({
  value,
  min,
  max,
  labelledBy,
  decreaseLabel,
  increaseLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  labelledBy: string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper" role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        className="stepper__button"
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="minus" />
      </button>
      <output className="stepper__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="stepper__button"
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
