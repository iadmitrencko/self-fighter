import { useCallback, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { createSession } from '../../domain/engine/session';
import type { Attempt, CampaignAttempt, FightAttempt, LadderAttempt, WorkoutAttempt } from '../../domain/history/attempt';
import { levelPlace } from '../../domain/kozak/place';
import type { Outcome } from '../../domain/results/results';
import { formatDateTime, formatDuration } from '../../i18n/format';
import { campaignName, journeyHistoryTexts, levelName } from '../../i18n/kozak-names';
import {
  commonTexts,
  historyTexts,
  ladderTexts,
  modeNames,
  outcomeTexts,
  resultTexts,
  ruleTexts,
  setupTexts,
  signInTexts,
} from '../../i18n/uk';
import type { AttemptStatus } from '../../storage/contract';
import { useArena } from '../arena';
import { Icon } from '../components/Icon';
import { BackLink, PlaceLink, Screen, ScreenHead, Title } from '../components/Screen';
import { SignInPrompt } from '../components/SignIn';
import { ErrorNotice, Loading, OutcomeBadge, StatusBadge } from '../components/notices';
import { useGame } from '../game';
import { useLoad } from '../useLoad';

// §13: the summary of a finished attempt, also opened from the history.
export function ResultScreen() {
  const { id = '' } = useParams();
  const { storage } = useGame();
  const arena = useArena();
  // A just finished attempt is usually on its way to the server: its status shows after that try.
  const load = useCallback(async () => {
    await storage.attempts.flush();

    return storage.attempts.get(id);
  }, [storage, id]);
  const [stored, reload] = useLoad(load);

  if (stored.status === 'ready' && stored.value !== null) {
    const { attempt, status } = stored.value;

    return attempt.mode === 'campaign' ? (
      <JourneyResult attempt={attempt} status={status} />
    ) : (
      <Result attempt={attempt} status={status} />
    );
  }

  return (
    <Screen title={resultTexts.notFound}>
      <ScreenHead
        back={arena.back.history}
        title={stored.status === 'ready' ? resultTexts.notFound : commonTexts.history}
      />
      {stored.status === 'loading' && <Loading />}
      {stored.status === 'failed' && <ErrorNotice error={stored.error} onRetry={reload} />}
      {stored.status === 'ready' && (
        <>
          <p>{resultTexts.notFoundText}</p>
          <div className="screen__actions">
            <Link className="button button--primary button--large" to={arena.paths.modes}>
              {commonTexts.newWorkout}
            </Link>
          </div>
        </>
      )}
    </Screen>
  );
}

function Result({ attempt, status }: { attempt: WorkoutAttempt; status: AttemptStatus }) {
  const { storage, analytics, deps } = useGame();
  const arena = useArena();
  const navigate = useNavigate();
  const [refused, setRefused] = useState(false);
  // §23.2: the offer to sign in comes after the first finished workout of a guest.
  const loadFirst = useCallback(async () => {
    const user = await storage.account.current();

    return user?.kind !== 'account' && (await storage.attempts.stats()).total === 1;
  }, [storage]);
  const [first] = useLoad(loadFirst);

  // §13.4: the same settings, new rolls of the opponent; the old attempt stays as it was.
  const repeat = () => {
    const session = arena.begin(createSession(attempt.config, deps, attempt.challenge));

    if (session === null) {
      setRefused(true);

      return;
    }
    arena.session.save(session);
    // §19 counts the repeats apart and the repeated workout among all the starts.
    analytics.track({ name: 'workout_repeated', mode: attempt.mode });
    analytics.track({ name: 'workout_started', mode: attempt.mode });
    void navigate(arena.paths.fight);
  };

  return (
    <Screen title={outcomeTexts[attempt.result.outcome].name}>
      <BackLink back={arena.back.history} />
      {/* The summary and the next steps first, the breakdown by rounds or steps after them. */}
      <div className="split split--result">
        <div className="split__column">
          {attempt.mode === 'ladder' ? <LadderHero attempt={attempt} /> : <FightHero attempt={attempt} />}
          <p className="result-meta">
            <span>{formatDateTime(attempt.finishedAt)}</span>
            <span>{resultTexts.duration(formatDuration(attempt.durationMs))}</span>
          </p>
          {attempt.challenge !== null && <ChallengeResult attempt={attempt} />}
          {arena.resultNote?.(attempt)}
          {status !== 'saved' && (
            <div className="notice notice--warning">
              <StatusBadge status={status} />
              <p>{status === 'pending' ? resultTexts.pending : resultTexts.rejected}</p>
            </div>
          )}
          <div className="screen__actions">
            {refused && arena.refusal}
            <button type="button" className="button button--primary button--large" onClick={repeat}>
              <Icon name="repeat" className="button__icon" />
              {resultTexts.repeat}
            </button>
            <div className="result-links">
              <Link className="button button--outline" to={arena.paths.modes}>
                {commonTexts.newWorkout}
              </Link>
              <PlaceLink className="button button--outline" place={{ ...arena.back.history, text: commonTexts.history }}>
                {commonTexts.history}
              </PlaceLink>
            </div>
            <p className="hint result-note">{resultTexts.repeatNote(attempt.mode)}</p>
          </div>
          {first.status === 'ready' && first.value && <SignInPrompt text={signInTexts.promptResult} />}
        </div>
        {attempt.mode === 'ladder' ? <LadderDetails attempt={attempt} /> : <FightRounds attempt={attempt} />}
      </div>
    </Screen>
  );
}

// §24.5: a level of the journey belongs to the game, which tells its story; the history of the
// site shows how it went and leads there.
function JourneyResult({ attempt, status }: { attempt: CampaignAttempt; status: AttemptStatus }) {
  const arena = useArena();
  const { outcome, sets } = attempt.result;
  const { symbol, name } = outcomeTexts[outcome];
  const campaign = campaignName(levelPlace(attempt.config.level)?.campaign ?? '');

  return (
    <Screen title={name}>
      <BackLink back={arena.back.history} />
      <div className="split split--result">
        <div className="split__column">
          <section className={`result-hero result-hero--${outcome}`}>
            <p className="result-hero__meta">
              <span>{journeyHistoryTexts.journey}</span>
              {campaign !== null && <span>{campaign}</span>}
            </p>
            <Title className="result-hero__title">
              <span aria-hidden="true">{symbol}</span> {name}
            </Title>
            <p className="result-hero__score">
              <span className="result-hero__number">
                {sets.filter(({ done }) => done).length} / {sets.length}
              </span>
              <span className="result-hero__unit">{levelName(attempt.config.level)}</span>
            </p>
          </section>
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
          <div className="screen__actions">
            {/* The game is a section of its own, so it opens as a page. */}
            <a className="button button--primary button--large" href={`/game/journey/result/${attempt.id}`}>
              {journeyHistoryTexts.openInGame}
            </a>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// §21.3: a win with the settings of the page passes the challenge for good.
function ChallengeResult({ attempt }: { attempt: Attempt }) {
  const { challenge } = attempt;
  const passed = attempt.result.outcome === 'win';

  if (challenge === null) {
    return null;
  }

  return (
    <p className={`challenge-result${passed ? ' challenge-result--passed' : ''}`}>
      {passed && <Icon name="check" className="challenge-result__icon" />}
      <span>{passed ? resultTexts.challengePassed(challenge.title) : resultTexts.challengeFailed(challenge.title)}</span>
      {/* The page of the challenge belongs to the site, so it opens as a page. */}
      <a href={`/challenges/${challenge.slug}`}>{resultTexts.toChallenge}</a>
    </p>
  );
}

function Hero({ attempt, children }: { attempt: WorkoutAttempt; children: ReactNode }) {
  const outcome: Outcome = attempt.result.outcome;
  const { symbol, name } = outcomeTexts[outcome];
  const label =
    attempt.mode === 'ladder' ? ladderTexts.name(attempt.config.returnDown) : modeNames[attempt.mode];

  return (
    <section className={`result-hero result-hero--${outcome}`}>
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
function FightHero({ attempt }: { attempt: FightAttempt }) {
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

function FightRounds({ attempt }: { attempt: FightAttempt }) {
  const target = attempt.mode === 'target';

  return (
    <section className="rounds" aria-label={resultTexts.rounds}>
      {attempt.result.rounds.map((round, number) => (
        <article key={number} className="round-card">
          <header className="round-card__head">
            <h2 className="round-card__title">{setupTexts.roundNumber(number + 1)}</h2>
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
