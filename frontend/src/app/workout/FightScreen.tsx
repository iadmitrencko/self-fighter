import { useEffect, useRef, useState, type FormEvent } from 'react';
import { parseReps } from '../../domain/config/validation';
import { stagePassed } from '../../domain/engine/rules';
import { nextStageIndex, type FightSession } from '../../domain/engine/session';
import { computeFightResult } from '../../domain/results/results';
import { fightTexts, modeNames } from '../../i18n/uk';
import { Icon } from '../components/Icon';
import { Screen, Title } from '../components/Screen';
import { MemoryWarning } from '../components/notices';
import { InterruptButton, Progress, RepsField } from './parts';

/**
 * §12: one exercise at a time. After a result the screen shows how the exercise went and,
 * once a round is over, how the round went; the next stage waits for the player.
 */
export function FightScreen({
  session,
  onSubmit,
  onInterrupt,
}: {
  session: FightSession;
  onSubmit: (reps: number) => boolean;
  onInterrupt: () => void;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const advanced = useRef(false);
  const current = nextStageIndex(session) ?? session.stages.length - 1;
  const index = shown ?? current;
  const stage = session.stages[index];
  const { config } = session;
  const target = config.mode === 'target';
  const score = computeFightResult(session.stages);
  const done = session.stages.filter(({ actual }) => actual !== null).length;

  // The next stage starts with the field ready for its number.
  useEffect(() => {
    if (shown === null && advanced.current) {
      input.current?.focus();
    }
  }, [shown]);

  if (stage === undefined) {
    return null;
  }
  const perRound = config.exercises.length;
  const next = session.stages[current];
  const roundOver = shown !== null && (next === undefined || next.round !== stage.round);
  const round = roundOver ? score.rounds[stage.round] : undefined;
  const passed = stagePassed(stage);

  function submit(event: FormEvent) {
    event.preventDefault();

    if (shown !== null) {
      return;
    }
    const reps = parseReps(text);

    if (reps === null) {
      setError(true);

      return;
    }
    setError(false);

    if (onSubmit(reps)) {
      setShown(current);
    }
  }

  function proceed() {
    advanced.current = true;
    setShown(null);
    setText('');
  }

  return (
    <Screen title={modeNames[session.mode]}>
      <header className="fight-head">
        <div>
          <p className="eyebrow">{modeNames[session.mode]}</p>
          <p className="fight-head__title">{fightTexts.round(stage.round + 1, config.rounds)}</p>
        </div>
        <InterruptButton onClick={onInterrupt} />
      </header>
      <MemoryWarning />
      <Progress done={done} total={session.stages.length} label={fightTexts.stage(Math.min(done + 1, session.stages.length), session.stages.length)} />
      <div className="split split--workout">
        <div className="split__column">
          <p className="score-line">
            <span className="visually-hidden">{fightTexts.score(target, score.won, score.lost)}</span>
            <span className="score-line__you" aria-hidden="true">
              {target ? fightTexts.won : fightTexts.you}
            </span>
            <span className="score-line__value score-line__value--you" aria-hidden="true">
              {score.won}
            </span>
            <span className="score-line__colon" aria-hidden="true">
              :
            </span>
            <span className="score-line__value score-line__value--rival" aria-hidden="true">
              {score.lost}
            </span>
            <span className="score-line__rival" aria-hidden="true">
              {target ? fightTexts.lost : fightTexts.rival}
            </span>
            <span className="score-line__unit" aria-hidden="true">
              {fightTexts.roundsScore}
            </span>
          </p>
          <div className="exercise-title">
            <p className="exercise-title__count">{fightTexts.exercise((index % perRound) + 1, perRound)}</p>
            <Title className="exercise-title__name">{stage.exercise.name}</Title>
          </div>
          <section className={target ? 'target-box target-box--goal' : 'target-box target-box--rival'}>
            <div className="target-box__text">
              <p className="target-box__label">{target ? fightTexts.goal : fightTexts.rivalDid}</p>
              <p className="target-box__need">{fightTexts.need(stage.target, stage.rule)}</p>
            </div>
            <p className="target-box__value">{stage.target}</p>
          </section>
        </div>
        <form className="workout-form" noValidate onSubmit={submit}>
          <RepsField
            text={shown === null ? text : String(stage.actual)}
            error={error}
            locked={shown !== null}
            inputRef={input}
            onChange={(value) => {
              setText(value);
              setError(false);
            }}
          />
          <div className="screen__actions">
            {shown !== null && stage.actual !== null && (
              <div className={passed ? 'feedback feedback--win' : 'feedback feedback--loss'} role="status">
                <p className="feedback__title">{passed ? fightTexts.exerciseWon : fightTexts.exerciseLost}</p>
                <p className="feedback__text">
                  {fightTexts.versus(stage.actual, stage.target)}
                  {round !== undefined &&
                    ` ${fightTexts.roundOver(stage.round + 1, round.won, round.lost, round.outcome)}`}
                </p>
              </div>
            )}
            {/* Separate keys: the same button turned into «submit» would send the form of the next stage. */}
            {shown === null ? (
              <button key="submit" type="submit" className="button button--primary button--large">
                {fightTexts.submit}
              </button>
            ) : (
              <button key="next" type="button" className="button button--light button--large" onClick={proceed}>
                {roundOver && next !== undefined ? fightTexts.nextRound(next.round + 1) : fightTexts.nextExercise}
                <Icon name="arrow" className="button__icon" />
              </button>
            )}
          </div>
        </form>
      </div>
    </Screen>
  );
}
