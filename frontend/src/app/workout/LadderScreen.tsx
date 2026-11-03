import { useState, type CSSProperties, type FormEvent } from 'react';
import { parseReps } from '../../domain/config/validation';
import { nextStageIndex, type LadderSession } from '../../domain/engine/session';
import { fightTexts, ladderTexts } from '../../i18n/uk';
import { Screen, Title } from '../components/Screen';
import { MemoryWarning } from '../components/notices';
import { InterruptButton, RepsField } from './parts';

// Long ladders show a window of steps around the current one (section 9 of the plan).
const VISIBLE_STEPS = 9;

// §9: one exercise, one step at a time. A missed step ends the attempt.
export function LadderScreen({
  session,
  onSubmit,
  onInterrupt,
}: {
  session: LadderSession;
  onSubmit: (reps: number) => boolean;
  onInterrupt: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const [passedStage, setPassedStage] = useState<number | null>(null);
  const index = nextStageIndex(session) ?? 0;
  const stage = session.stages[index];
  const { exercise, max, returnDown } = session.config;
  const total = session.stages.length;
  const first = Math.max(0, Math.min(index - Math.floor(VISIBLE_STEPS / 2), total - VISIBLE_STEPS));

  if (stage === undefined) {
    return null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const reps = parseReps(text);

    if (reps === null) {
      setError(true);

      return;
    }
    setError(false);

    if (onSubmit(reps)) {
      setPassedStage(index + 1);
      setText('');
    }
  }

  return (
    <Screen title={exercise.name}>
      <header className="fight-head">
        <div>
          <p className="eyebrow">{ladderTexts.name(returnDown)}</p>
          <Title className="fight-head__title">{exercise.name}</Title>
        </div>
        <InterruptButton onClick={onInterrupt} />
      </header>
      <MemoryWarning />
      <div className="split split--workout">
        <section className="ladder">
          <div
            className="ladder__steps"
            role="progressbar"
            aria-label={fightTexts.progress}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={index}
            aria-valuetext={ladderTexts.progress(index, total)}
          >
            {session.stages.slice(first, first + VISIBLE_STEPS).map((step, offset) => {
              const position = first + offset;
              const state = position < index ? 'done' : position === index ? 'current' : 'next';

              return (
                <span
                  key={position}
                  className={`ladder__step ladder__step--${state}`}
                  style={{ '--height': `${28 + (72 * step.target) / max}%` } as CSSProperties}
                >
                  <span className="ladder__value">{step.target}</span>
                  <span className="ladder__mark">{state === 'done' ? '✓' : state === 'current' ? '●' : ''}</span>
                </span>
              );
            })}
          </div>
          <p className="ladder__counts">
            <span>{fightTexts.stage(index + 1, total)}</span>
            <span>{ladderTexts.passed(index)}</span>
          </p>
        </section>
        <div className="split__column">
          <section className="ladder-target">
            <p className="eyebrow">{index >= max ? ladderTexts.descent : ladderTexts.climb}</p>
            <p className="ladder-target__value">{stage.target}</p>
            <p className="ladder-target__need">{ladderTexts.need(stage.target, stage.rule)}</p>
          </section>
          <p className="ladder-status" role="status">
            {passedStage === null ? '' : ladderTexts.stagePassed(passedStage)}
          </p>
          <form className="workout-form" noValidate onSubmit={submit}>
            <RepsField
              text={text}
              error={error}
              locked={false}
              onChange={(value) => {
                setText(value);
                setError(false);
              }}
            />
            <div className="screen__actions">
              <button type="submit" className="button button--primary button--large">
                {ladderTexts.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Screen>
  );
}
