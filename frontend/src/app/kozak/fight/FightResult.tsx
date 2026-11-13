import { useCallback, useId, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { isLegacy, type FightAttempt } from '../../../domain/history/attempt';
import { FIGHT_GLORY } from '../../../domain/kozak/glory';
import { standingOf } from '../../../domain/kozak/ranks';
import type { FightResult as Result } from '../../../domain/results/results';
import { formatDateTime, formatDuration } from '../../../i18n/format';
import { fightHallTexts, fightResultTexts, rankNames, victoryTexts } from '../../../i18n/kozak';
import { resultTexts, signInTexts } from '../../../i18n/uk';
import type { AttemptStatus } from '../../../storage/contract';
import { Title } from '../../components/Screen';
import { SignInPrompt } from '../../components/SignIn';
import { ErrorNotice, Loading } from '../../components/notices';
import { useGame } from '../../game';
import { useLoad } from '../../useLoad';
import { kozakPaths } from '../paths';
import { KozakIcon, KozakScreen } from '../parts';
import { useCossack, useFresh } from '../record';
import { useFightStart, type FightRefusal } from './FightArena';
import { LegacyResult } from './LegacyResult';

// §6, §13: how a fight ended, also opened from the history.
export function FightResult() {
  const { id = '' } = useParams();
  const { storage } = useGame();
  // A fight that has just ended is on its way to the server: its status shows after that try.
  const load = useCallback(async () => {
    await storage.attempts.flush();

    return storage.attempts.get(id);
  }, [storage, id]);
  const [stored, reload] = useLoad(load);

  if (stored.status === 'loading') {
    return <Loading />;
  }
  if (stored.status === 'failed') {
    return (
      <KozakScreen title={resultTexts.notFound}>
        <ErrorNotice error={stored.error} onRetry={reload} />
      </KozakScreen>
    );
  }
  if (stored.value === null) {
    return (
      <KozakScreen title={resultTexts.notFound} className="k-fight-result">
        <Title className="k-title">{resultTexts.notFound}</Title>
        <p className="k-lead">{resultTexts.notFoundText}</p>
        <div className="k-actions">
          <Link className="k-button k-button--primary k-button--large" to={kozakPaths.fight}>
            {fightResultTexts.newFight}
          </Link>
        </div>
      </KozakScreen>
    );
  }
  const { attempt, status } = stored.value;

  // §24.5, §24.9: a level of the journey and a battle of the duel have a result of their own, which tells their story.
  if (attempt.mode === 'campaign' || attempt.mode === 'duel') {
    return <Navigate to={kozakPaths.outcome(attempt.id)} replace />;
  }

  return isLegacy(attempt) ? <LegacyResult attempt={attempt} status={status} /> : <FightOutcome attempt={attempt} status={status} />;
}

function FightOutcome({ attempt, status }: { attempt: FightAttempt; status: AttemptStatus }) {
  const { storage, analytics } = useGame();
  const fights = useFightStart();
  const navigate = useNavigate();
  const { cossack, current } = useCossack();
  const fresh = useFresh();
  const [refusal, setRefusal] = useState<FightRefusal | null>(null);
  // §23.2: the offer to sign in comes after the first finished battle of a guest.
  const loadFirst = useCallback(async () => {
    const user = await storage.account.current();

    return user?.kind !== 'account' && (await storage.attempts.stats()).total === 1;
  }, [storage]);
  const [first] = useLoad(loadFirst);
  const won = attempt.result.outcome === 'win';
  const sets = attempt.result.exercises.flatMap((exercise) => exercise.sets);
  const done = sets.filter((set) => set.done);
  const reps = (list: typeof sets) => list.reduce((total, set) => total + set.target, 0);
  // A new rank is told right after the fight, when the record already counts it.
  const glory = cossack.status === 'ready' && current ? cossack.value.glory : null;
  const promoted =
    won && fresh && glory !== null && standingOf(glory - FIGHT_GLORY).rank.id !== standingOf(glory).rank.id
      ? standingOf(glory).rank.id
      : null;

  // §13.4: the same fight again, as a new attempt; the old one stays as it was.
  const repeat = () => {
    const refused = fights.start(attempt.config);

    if (refused !== null) {
      setRefusal(refused);

      return;
    }
    // §19 counts the repeats apart and the repeated fight among all the starts.
    analytics.track({ name: 'workout_repeated', mode: 'fight' });
    analytics.track({ name: 'workout_started', mode: 'fight' });
    void navigate(kozakPaths.fightBattle);
  };
  const title = won ? fightResultTexts.winTitle : fightResultTexts.lossTitle;

  return (
    <KozakScreen title={title} className={won ? 'k-fight-result' : 'k-fight-result k-fight-result--defeat'}>
      <div className="k-outcome__body">
        <p className={won ? 'k-fight-result__badge' : 'k-fight-result__badge k-fight-result__badge--muted'}>
          {won ? fightResultTexts.winBadge : fightResultTexts.lossBadge}
        </p>
        <Title className="k-title k-outcome__title">{title}</Title>
        <p className="k-outcome__sub">{won ? fightResultTexts.winText : fightResultTexts.lossText}</p>
        <dl className="k-tiles k-tiles--result">
          <div className="k-tile">
            <dt>{fightResultTexts.sets}</dt>
            <dd className="k-tile__big">{fightResultTexts.setsOf(done.length, sets.length)}</dd>
          </div>
          <div className="k-tile">
            <dt>{fightResultTexts.reps}</dt>
            <dd className="k-tile__big">{fightResultTexts.setsOf(reps(done), reps(sets))}</dd>
          </div>
          <div className={won ? 'k-tile k-tile--glory' : 'k-tile'}>
            <dt>{fightResultTexts.glory}</dt>
            <dd className="k-tile__big">{won ? `+${FIGHT_GLORY}` : 0}</dd>
          </div>
        </dl>
        <p className="k-outcome__sub">{won ? fightResultTexts.gloryNote : fightResultTexts.noGlory}</p>
        {promoted !== null && (
          <p className="k-outcome__rank" role="status">
            {victoryTexts.newRank}: <b>{rankNames[promoted]}</b>
          </p>
        )}
        {status !== 'saved' && (
          <p className="notice notice--warning">{status === 'pending' ? resultTexts.pending : resultTexts.rejected}</p>
        )}
      </div>
      <ResultGrid result={attempt.result} />
      <div className="k-outcome__body">
        <p className="k-fight-result__meta">
          <span>{formatDateTime(attempt.finishedAt)}</span>
          <span>{resultTexts.duration(formatDuration(attempt.durationMs))}</span>
        </p>
        {refusal !== null && (
          <p className="notice notice--warning" role="alert">
            {refusal === 'busy' ? fightHallTexts.busy : fightHallTexts.refusal}
          </p>
        )}
        <div className="k-actions k-actions--stack">
          <button type="button" className="k-button k-button--primary k-button--large" onClick={repeat}>
            {fightResultTexts.repeat}
            <span className="k-summary__cost">{fightResultTexts.repeatCost}</span>
          </button>
          <Link className="k-button k-button--secondary" to={kozakPaths.fight}>
            {fightResultTexts.newFight}
          </Link>
          <Link className="k-button k-button--text" to={kozakPaths.history}>
            {fightResultTexts.history}
          </Link>
        </div>
        {first.status === 'ready' && first.value && <SignInPrompt text={signInTexts.promptResult} />}
      </div>
    </KozakScreen>
  );
}

// Every set of the fight, done or not, in the grid it was put together in.
function ResultGrid({ result }: { result: Result }) {
  const titleId = useId();
  const rounds = Math.max(0, ...result.exercises.map(({ sets }) => sets.length));

  // The grid may scroll sideways on a phone with nothing to focus inside, so it takes the focus itself.
  return (
    <div className="k-grid k-grid--result">
      <h2 id={titleId} className="visually-hidden">
        {fightResultTexts.grid}
      </h2>
      <div className="k-grid__scroll" role="region" aria-labelledby={titleId} tabIndex={0}>
        <div className="k-grid__table" style={{ '--rounds': rounds } as CSSProperties}>
          <div className="k-grid__row k-grid__row--head" aria-hidden="true">
            <span className="k-grid__corner">{fightHallTexts.exercise}</span>
            {Array.from({ length: rounds }, (_, round) => (
              <span key={round} className="k-grid__round">
                {fightHallTexts.round(round + 1)}
              </span>
            ))}
          </div>
          {result.exercises.map(({ exercise, sets }, row) => (
            <div key={exercise.id} className="k-grid__row">
              <p className="k-grid__exercise">
                <span className="k-grid__index" aria-hidden="true">
                  {String(row + 1).padStart(2, '0')}
                </span>
                <span className="k-grid__name">{exercise.name}</span>
              </p>
              {sets.map((set, round) => (
                <p key={round} className={set.done ? 'k-cell k-cell--done' : 'k-cell k-cell--missed'}>
                  <KozakIcon name={set.done ? 'check' : 'close'} className="k-cell__mark" />
                  <span className="k-cell__reps">{set.target}</span>
                  <span className="visually-hidden">
                    {`${fightHallTexts.roundName(round + 1)}, ${set.done ? fightResultTexts.done : fightResultTexts.notDone}`}
                  </span>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
