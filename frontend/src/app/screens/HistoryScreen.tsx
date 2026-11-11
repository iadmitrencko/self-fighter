import { useCallback, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Mode } from '../../domain/config/types';
import type { Attempt } from '../../domain/history/attempt';
import type { Statistics } from '../../domain/history/statistics';
import { levelPlace } from '../../domain/kozak/place';
import type { Outcome } from '../../domain/results/results';
import { formatShortDateTime } from '../../i18n/format';
import { campaignName, journeyHistoryTexts, levelName } from '../../i18n/kozak-names';
import { commonTexts, historyTexts, modeNames, outcomeTexts, signInTexts } from '../../i18n/uk';
import type { AttemptFilter, StoredAttempt } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { Icon } from '../components/Icon';
import { BACK, Screen, ScreenHead } from '../components/Screen';
import { SignInPrompt } from '../components/SignIn';
import { ErrorNotice, Loading, OutcomeBadge, StatusBadge } from '../components/notices';
import { useGame } from '../game';
import { MODES, paths } from '../paths';
import { errorCode, useLoad } from '../useLoad';

const OUTCOMES: readonly Outcome[] = ['win', 'draw', 'loss'];

// Pages loaded with «Показати ще» belong to the filter they were loaded for.
interface MorePages {
  readonly filter: AttemptFilter;
  readonly items: readonly StoredAttempt[];
  readonly cursor: string | null;
}

// §14: one history of all modes, its statistics and filters by mode and result.
export function HistoryScreen() {
  const { storage } = useGame();
  const [mode, setMode] = useState<Mode | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const filter = useMemo<AttemptFilter>(
    () => ({ mode: mode ?? undefined, outcome: outcome ?? undefined }),
    [mode, outcome],
  );
  const loadStats = useCallback(() => storage.attempts.stats(filter), [storage, filter]);
  const [stats, reloadStats] = useLoad(loadStats);
  const loadPage = useCallback(() => storage.attempts.list(filter), [storage, filter]);
  const [page, reloadPage] = useLoad(loadPage);
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [user] = useLoad(loadUser);
  const signedIn = user.status === 'ready' && user.value?.kind === 'account';
  const [more, setMore] = useState<MorePages | null>(null);
  const [moreError, setMoreError] = useState<StorageErrorCode | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more?.filter === filter ? more : null;
  const filtered = mode !== null || outcome !== null;

  async function showMore(cursor: string) {
    setLoadingMore(true);
    setMoreError(null);

    try {
      const next = await storage.attempts.list({ ...filter, cursor });
      setMore({ filter, items: [...(extra?.items ?? []), ...next.items], cursor: next.nextCursor });
    } catch (error) {
      setMoreError(errorCode(error));
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => {
    reloadStats();
    reloadPage();
  };
  const failure = stats.status === 'failed' ? stats.error : page.status === 'failed' ? page.error : null;
  const cursor = extra === null ? (page.status === 'ready' ? page.value.nextCursor : null) : extra.cursor;

  return (
    <Screen title={historyTexts.title}>
      <ScreenHead back={BACK.modes} title={historyTexts.title} />
      {failure !== null && <ErrorNotice error={failure} onRetry={retry} />}
      {/* On a desktop the statistics and the filters stay beside the list. */}
      <div className="split split--aside">
        <div className="split__column">
          {stats.status === 'ready' && <StatisticsCard stats={stats.value} />}
          <div className="filters">
            <FilterGroup
              legend={historyTexts.modeFilter}
              name="mode"
              value={mode}
              options={MODES.map((item) => ({ value: item, label: historyTexts.modeShort[item] }))}
              onChange={setMode}
            />
            <FilterGroup
              legend={historyTexts.outcomeFilter}
              name="outcome"
              value={outcome}
              options={OUTCOMES.map((item) => ({ value: item, label: outcomeTexts[item].plural }))}
              onChange={setOutcome}
            />
          </div>
          <p className="note">
            <Icon name="info" className="note__icon" />
            <span>
              {signedIn ? historyTexts.accountNote : historyTexts.note} <Link to={paths.account}>{commonTexts.account}</Link>
            </span>
          </p>
          {/* §23.2: the history is where a guest misses it on another device. */}
          {user.status === 'ready' && !signedIn && <SignInPrompt text={signInTexts.promptHistory} />}
        </div>
        <div className="split__column">
          {page.status === 'loading' && <Loading />}
          {page.status === 'ready' && (
            <>
              {page.value.items.length === 0 ? (
                <div className="empty">
                  <p>{filtered ? historyTexts.emptyFiltered : historyTexts.empty}</p>
                  {!filtered && (
                    <Link className="button button--primary button--large" to={paths.modes}>
                      {historyTexts.start}
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="history" role="list">
                  {[...page.value.items, ...(extra?.items ?? [])].map((stored) => (
                    <HistoryItem key={stored.attempt.id} stored={stored} />
                  ))}
                </ul>
              )}
              {moreError !== null && <ErrorNotice error={moreError} />}
              {cursor !== null && (
                <button
                  type="button"
                  className="button button--outline button--large"
                  disabled={loadingMore}
                  onClick={() => void showMore(cursor)}
                >
                  {historyTexts.more}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}

// §14.2: the total always equals wins, draws and losses together.
function StatisticsCard({ stats }: { stats: Statistics }) {
  const titleId = useId();
  const parts = [
    { outcome: 'win', count: stats.wins },
    { outcome: 'draw', count: stats.draws },
    { outcome: 'loss', count: stats.losses },
  ] as const;

  return (
    <section className="card stats" aria-labelledby={titleId}>
      <h2 id={titleId} className="visually-hidden">
        {historyTexts.stats}
      </h2>
      <p className="stats__total">
        <span className="eyebrow">{historyTexts.total}</span>
        <span className="stats__number">{stats.total}</span>
      </p>
      {stats.total > 0 && (
        <div className="stats__bar" aria-hidden="true">
          {parts.map(({ outcome, count }) =>
            count > 0 ? <span key={outcome} className={`stats__part stats__part--${outcome}`} style={{ flexGrow: count }} /> : null,
          )}
        </div>
      )}
      <dl className="stats__counts">
        {parts.map(({ outcome, count }) => (
          <div key={outcome} className={`stats__count stats__count--${outcome}`}>
            <dt>
              <span aria-hidden="true">{outcomeTexts[outcome].symbol}</span> {outcomeTexts[outcome].plural}
            </dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      {/* §21.3: the challenges passed, each counted once. The catalog is a page of the site. */}
      <p className="stats__challenges">
        <span className="stats__challenges-label">
          <Icon name="check" className="stats__challenges-icon" />
          {historyTexts.challenges}
        </span>
        <span className="stats__challenges-number">{stats.challenges.length}</span>
        <a className="stats__catalog" href="/challenges">
          {historyTexts.catalog}
        </a>
      </p>
    </section>
  );
}

function FilterGroup<TValue extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: TValue | null;
  options: readonly { value: TValue; label: string }[];
  onChange: (value: TValue | null) => void;
}) {
  return (
    <fieldset className="filter">
      <legend className="filter__legend">{legend}</legend>
      <div className="filter__options">
        {[{ value: null, label: historyTexts.all }, ...options].map((option) => (
          <label key={option.value ?? 'all'} className="chip chip--option">
            <input
              type="radio"
              name={name}
              className="chip__input"
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function details(attempt: Attempt): string {
  if (attempt.mode === 'campaign') {
    const place = levelPlace(attempt.config.level);
    const { sets } = attempt.result;

    return journeyHistoryTexts.level(
      campaignName(place?.campaign ?? '') ?? '',
      place?.stage ?? 0,
      levelName(attempt.config.level),
      sets.filter(({ done }) => done).length,
      sets.length,
    );
  }
  if (attempt.mode === 'ladder') {
    const { config, result } = attempt;

    return historyTexts.ladderDetails(
      config.exercise.name,
      config.max,
      config.returnDown,
      result.passedCount,
      result.stages.length,
    );
  }

  return historyTexts.fightDetails(
    attempt.config.rounds,
    attempt.config.exercises.length,
    attempt.result.won,
    attempt.result.lost,
  );
}

function HistoryItem({ stored: { attempt, status } }: { stored: StoredAttempt }) {
  return (
    <li className="history__item">
      <Link className="history__link" to={paths.result(attempt.id)}>
        <span className="history__mode">
          {attempt.mode === 'campaign' ? journeyHistoryTexts.journey : modeNames[attempt.mode]}
        </span>
        <span className="history__details">{details(attempt)}</span>
        {attempt.challenge !== null && (
          <span className={`history__challenge${attempt.result.outcome === 'win' ? ' history__challenge--passed' : ''}`}>
            {historyTexts.challenge(attempt.challenge.title, attempt.result.outcome === 'win')}
          </span>
        )}
      </Link>
      <span className="history__badges">
        <OutcomeBadge outcome={attempt.result.outcome} />
        <StatusBadge status={status} />
      </span>
      <span className="history__date">{formatShortDateTime(attempt.finishedAt)}</span>
    </li>
  );
}
