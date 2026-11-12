import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { LadderAttempt, LegacyAttempt, RoundsAttempt } from '../../../domain/history/legacy';
import { formatDateTime, formatDuration } from '../../../i18n/format';
import { fightResultTexts } from '../../../i18n/kozak';
import {
  commonTexts,
  historyTexts,
  ladderTexts,
  modeNames,
  outcomeTexts,
  resultTexts,
  ruleTexts,
} from '../../../i18n/uk';
import type { AttemptStatus } from '../../../storage/contract';
import { BackLink, Screen, Title } from '../../components/Screen';
import { OutcomeBadge, StatusBadge } from '../../components/notices';
import { kozakPaths } from '../paths';

/**
 * §13: the result of an attempt of a mode the site had before a fight was put together freely
 * (§6). The history keeps it as it was; it cannot be repeated, a new fight can be put together.
 */
export function LegacyResult({ attempt, status }: { attempt: LegacyAttempt; status: AttemptStatus }) {
  return (
    <Screen title={outcomeTexts[attempt.result.outcome].name}>
      <BackLink back={{ to: kozakPaths.history, text: commonTexts.toHistory }} />
      {/* The summary and the next steps first, the breakdown by rounds or steps after them. */}
      <div className="split split--result">
        <div className="split__column">
          {attempt.mode === 'ladder' ? <LadderHero attempt={attempt} /> : <RoundsHero attempt={attempt} />}
          <p className="result-meta">
            <span>{formatDateTime(attempt.finishedAt)}</span>
            <span>{resultTexts.duration(formatDuration(attempt.durationMs))}</span>
          </p>
          {status !== 'saved' && (
            <div className="notice notice--warning">
              <StatusBadge status={status} />
              <p>{status === 'pending' ? resultTexts.pending : resultTexts.rejected}</p>
            </div>
          )}
          <p className="hint">{fightResultTexts.legacyNote}</p>
          <div className="result-links">
            <Link className="button button--primary" to={kozakPaths.fight}>
              {fightResultTexts.newFight}
            </Link>
            <Link className="button button--outline" to={kozakPaths.history}>
              {commonTexts.history}
            </Link>
          </div>
        </div>
        {attempt.mode === 'ladder' ? <LadderDetails attempt={attempt} /> : <Rounds attempt={attempt} />}
      </div>
    </Screen>
  );
}

function Hero({ attempt, children }: { attempt: LegacyAttempt; children: ReactNode }) {
  const { symbol, name } = outcomeTexts[attempt.result.outcome];
  const label =
    attempt.mode === 'ladder' ? ladderTexts.name(attempt.config.returnDown) : modeNames[attempt.mode];

  return (
    <section className={`result-hero result-hero--${attempt.result.outcome}`}>
      <p className="result-hero__meta">
        <span>{label}</span>
        <span>{ruleTexts[attempt.config.rule].name}</span>
      </p>
      <Title className="result-hero__title">
        <span aria-hidden="true">{symbol}</span> {name}
      </Title>
      {children}
    </section>
  );
}

// §13.2: the rounds, how many were won, drawn and lost, and the result of the fight.
function RoundsHero({ attempt }: { attempt: RoundsAttempt }) {
  const { won, drawn, lost } = attempt.result;

  return (
    <Hero attempt={attempt}>
      <p className="result-hero__score">
        <span className="result-hero__number">
          {won} : {lost}
        </span>
        <span className="result-hero__unit">{resultTexts.byRounds}</span>
      </p>
      <dl className="result-hero__counts">
        <div>
          <dt>
            <span aria-hidden="true">▲</span> {resultTexts.won}
          </dt>
          <dd>{won}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true">=</span> {resultTexts.drawn}
          </dt>
          <dd>{drawn}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true">▼</span> {resultTexts.lost}
          </dt>
          <dd>{lost}</dd>
        </div>
      </dl>
    </Hero>
  );
}

function Rounds({ attempt }: { attempt: RoundsAttempt }) {
  const target = attempt.mode === 'target';

  return (
    <section className="rounds" aria-label={resultTexts.rounds}>
      {attempt.result.rounds.map((round, number) => (
        <article key={number} className="round-card">
          <header className="round-card__head">
            <h2 className="round-card__title">{resultTexts.roundNumber(number + 1)}</h2>
            <OutcomeBadge outcome={round.outcome} />
          </header>
          <table className="round-card__table">
            <thead>
              <tr>
                <th scope="col" className="visually-hidden">
                  {resultTexts.rounds}
                </th>
                <th scope="col" className="round-card__you">
                  {resultTexts.you}
                </th>
                <th scope="col" className={target ? 'round-card__goal' : 'round-card__rival'}>
                  {target ? resultTexts.goal : <abbr title={resultTexts.rivalFull}>{resultTexts.rival}</abbr>}
                </th>
                <th scope="col">
                  <span className="visually-hidden">{historyTexts.outcomeFilter}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {round.exercises.map(({ exercise, actual, target: value, outcome }) => (
                <tr key={exercise.id}>
                  <th scope="row" className="round-card__exercise">
                    {exercise.name}
                  </th>
                  <td className="round-card__you">{actual}</td>
                  <td className={target ? 'round-card__goal' : 'round-card__rival'}>{value}</td>
                  <td className="round-card__mark">
                    <span aria-hidden="true">{outcome === 'win' ? '▲' : '▼'}</span>
                    <span className="visually-hidden">
                      {outcome === 'win' ? resultTexts.exerciseWin : resultTexts.exerciseLoss}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </section>
  );
}

// §13.3: the top of the ladder, the highest step passed, the steps and the way back down.
function LadderHero({ attempt }: { attempt: LadderAttempt }) {
  const { passedCount, stages } = attempt.result;

  return (
    <Hero attempt={attempt}>
      <p className="result-hero__score">
        <span className="result-hero__number">{resultTexts.ladderPassed(passedCount, stages.length)}</span>
        <span className="result-hero__unit">{resultTexts.ladderStages}</span>
      </p>
    </Hero>
  );
}

function LadderDetails({ attempt }: { attempt: LadderAttempt }) {
  const { config, result } = attempt;

  return (
    <section className="card ladder-result">
      <h2 className="ladder-result__title">{config.exercise.name}</h2>
      <dl className="facts">
        <div>
          <dt>{resultTexts.ladderMax}</dt>
          <dd>{config.max}</dd>
        </div>
        <div>
          <dt>{resultTexts.ladderBest}</dt>
          <dd>{result.maxPassed}</dd>
        </div>
        <div>
          <dt>{resultTexts.returnDown}</dt>
          <dd>{config.returnDown ? resultTexts.yes : resultTexts.no}</dd>
        </div>
      </dl>
      <h3 className="setup-section__title">{resultTexts.sequence}</h3>
      <ol className="sequence" role="list">
        {result.stages.map((stage, index) => (
          <li
            key={index}
            className={`sequence__step sequence__step--${stage.actual === null ? 'skipped' : stage.passed ? 'passed' : 'failed'}`}
          >
            <span aria-hidden="true">{stage.target}</span>
            <span className="visually-hidden">{resultTexts.stageResult(stage.target, stage.actual, stage.passed)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
