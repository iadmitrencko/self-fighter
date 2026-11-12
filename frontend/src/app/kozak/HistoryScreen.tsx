import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { roundsOf } from '../../domain/config/grid';
import type { Attempt } from '../../domain/history/attempt';
import type { Statistics } from '../../domain/history/statistics';
import { levelPlace } from '../../domain/kozak/place';
import type { Outcome } from '../../domain/results/results';
import { formatShortDateTime } from '../../i18n/format';
import { gameHistoryTexts, kozakTexts } from '../../i18n/kozak';
import { campaignName, levelName } from '../../i18n/kozak-names';
import { commonTexts, historyTexts, modeNames, outcomeTexts, signInTexts } from '../../i18n/uk';
import type { AttemptFilter, StoredAttempt } from '../../storage/contract';
import type { StorageErrorCode } from '../../storage/errors';
import { Title } from '../components/Screen';
import { SignInPrompt } from '../components/SignIn';
import { ErrorNotice, StatusBadge } from '../components/notices';
import { useGame } from '../game';
import { errorCode, useLoad } from '../useLoad';
import { kozakPaths } from './paths';
import { KozakScreen } from './parts';

type HistoryMode = Extract<Attempt['mode'], 'fight' | 'campaign'>;

// §6, §24.5: the fights and the journey of the game. The attempts of the old modes of the site show among all.
const MODE_FILTERS: readonly HistoryMode[] = ['fight', 'campaign'];
const OUTCOMES: readonly Outcome[] = ['win', 'draw', 'loss'];

// Pages loaded with «Показати ще» belong to the filter they were loaded for.
interface MorePages {
  readonly filter: AttemptFilter;
  readonly items: readonly StoredAttempt[];
  readonly cursor: string | null;
}

/**
 * §14, §24.1: the one history of every attempt as a section of the game: the fights of the game,
 * the levels of the journey and the workouts of the site, with the statistics and the filters
 * beside the list on a wide screen and above it on a phone.
 */
export function HistoryScreen() {
  const { storage } = useGame();
  const [mode, setMode] = useState<HistoryMode | null>(null);
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
    <KozakScreen title={gameHistoryTexts.title} className="k-history-screen">
      <header className="k-head">
        <Title className="k-title">{gameHistoryTexts.title}</Title>
        <p className="k-lead">{gameHistoryTexts.lead}</p>
      </header>
      {failure !== null && <ErrorNotice error={failure} onRetry={retry} />}
      <div className="k-history-layout">
        {stats.status === 'ready' && <Tally stats={stats.value} />}
        <div className="k-card k-filters">
          <FilterGroup
            legend={historyTexts.modeFilter}
            name="mode"
            value={mode}
            options={MODE_FILTERS.map((item) => ({
              value: item,
              label: item === 'campaign' ? gameHistoryTexts.journey : gameHistoryTexts.kinds.fight,
            }))}
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
        <div className="k-history">
          {page.status === 'loading' && (
            <p className="k-loading" role="status">
              {commonTexts.loading}
            </p>
          )}
          {page.status === 'ready' && (
            <>
              {page.value.items.length === 0 ? (
                <Empty filtered={filtered} />
              ) : (
                // list-style: none takes the list away from VoiceOver in Safari; the role brings it back.
                <ul className="k-history__list" role="list">
                  {[...page.value.items, ...(extra?.items ?? [])].map((stored) => (
                    <HistoryEntry key={stored.attempt.id} stored={stored} />
                  ))}
                </ul>
              )}
              {moreError !== null && <ErrorNotice error={moreError} />}
              {cursor !== null && (
                <button
                  type="button"
                  className="k-button k-button--secondary"
                  disabled={loadingMore}
                  onClick={() => void showMore(cursor)}
                >
                  {historyTexts.more}
                </button>
              )}
            </>
          )}
        </div>
        <div className="k-history-aside">
          <p className="k-history-aside__note">
            {signedIn ? historyTexts.accountNote : historyTexts.note}{' '}
            <Link to={kozakPaths.settings}>{kozakTexts.nav.settings}</Link>
          </p>
          {/* §23.2: the history is where a guest misses it on another device. */}
          {user.status === 'ready' && !signedIn && <SignInPrompt text={signInTexts.promptHistory} />}
        </div>
      </div>
    </KozakScreen>
  );
}

// §14.2: the total always equals wins, draws and losses together.
function Tally({ stats }: { stats: Statistics }) {
  const titleId = useId();
  const parts = [
    { outcome: 'win', count: stats.wins },
    { outcome: 'draw', count: stats.draws },
    { outcome: 'loss', count: stats.losses },
  ] as const;

  return (
    <section className="k-card k-tally" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-card__label">
        {historyTexts.stats}
      </h2>
      <p className="k-tally__total">
        <b>{stats.total}</b> <span>{gameHistoryTexts.total(stats.total)}</span>
      </p>
      {stats.total > 0 && (
        <div className="k-tally__bar" aria-hidden="true">
          {parts.map(({ outcome, count }) =>
            count > 0 ? (
              <span key={outcome} className={`k-tally__part k-tally__part--${outcome}`} style={{ flexGrow: count }} />
            ) : null,
          )}
        </div>
      )}
      <dl className="k-tally__counts">
        {parts.map(({ outcome, count }) => (
          <div key={outcome} className={`k-tally__count k-tally__count--${outcome}`}>
            <dt>{outcomeTexts[outcome].plural}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
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
    <fieldset className="k-filter">
      <legend className="k-filter__legend">{legend}</legend>
      <div className="k-filter__options">
        {[{ value: null, label: historyTexts.all }, ...options].map((option) => (
          <label key={option.value ?? 'all'} className="k-chip">
            <input
              type="radio"
              name={name}
              className="k-chip__input"
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

function Empty({ filtered }: { filtered: boolean }) {
  return (
    <div className="k-history__empty">
      <p>{filtered ? historyTexts.emptyFiltered : gameHistoryTexts.empty}</p>
      {!filtered && (
        <div className="k-actions">
          <Link className="k-button k-button--primary" to={kozakPaths.fight}>
            {gameHistoryTexts.toFight}
          </Link>
          <Link className="k-button k-button--secondary" to={kozakPaths.journey}>
            {gameHistoryTexts.toJourney}
          </Link>
        </div>
      )}
    </div>
  );
}

// A fight of the game, a level of the journey or a workout of the site.
function kindOf(attempt: Attempt): keyof typeof gameHistoryTexts.kinds {
  if (attempt.mode === 'campaign') {
    return 'journey';
  }

  return attempt.game === null ? 'workout' : 'fight';
}

// A level by its name, a fight by its exercises, an attempt of an old mode by the mode.
function nameOf(attempt: Attempt): string {
  switch (attempt.mode) {
    case 'campaign':
      return levelName(attempt.config.level);
    case 'fight':
      return attempt.config.exercises.map(({ name }) => name).join(', ');
    default:
      return modeNames[attempt.mode];
  }
}

function details(attempt: Attempt): string {
  if (attempt.mode === 'campaign') {
    const place = levelPlace(attempt.config.level);
    const { sets } = attempt.result;

    return gameHistoryTexts.level(
      campaignName(place?.campaign ?? '') ?? '',
      place?.stage ?? 0,
      sets.filter(({ done }) => done).length,
      sets.length,
    );
  }
  if (attempt.mode === 'fight') {
    const sets = attempt.result.exercises.flatMap((exercise) => exercise.sets);

    return historyTexts.setsDetails(roundsOf(attempt.config), attempt.config.exercises.length, sets.filter(({ done }) => done).length, sets.length);
  }
  if (attempt.mode === 'ladder') {
    const { config, result } = attempt;

    return historyTexts.ladderDetails(config.exercise.name, config.max, config.returnDown, result.passedCount, result.stages.length);
  }

  return historyTexts.fightDetails(attempt.config.rounds, attempt.config.exercises.length, attempt.result.won, attempt.result.lost);
}

// The whole card opens the result: a level has its own, a fight and an old workout of the site
// open as a fight of the game.
function EntryLink({ attempt, className, children }: { attempt: Attempt; className: string; children: ReactNode }) {
  return (
    <Link
      className={className}
      to={attempt.mode === 'campaign' ? kozakPaths.outcome(attempt.id) : kozakPaths.fightResult(attempt.id)}
    >
      {children}
    </Link>
  );
}

function HistoryEntry({ stored: { attempt, status } }: { stored: StoredAttempt }) {
  const { outcome } = attempt.result;
  const { symbol, name } = outcomeTexts[outcome];

  return (
    <li>
      <EntryLink attempt={attempt} className={`k-entry k-entry--${outcome}`}>
        <span className="k-entry__marker" aria-hidden="true">
          {symbol}
        </span>
        {/* The spaces keep the words apart for a screen reader; the grid does not show them. */}
        <span className="k-entry__body">
          <span className={attempt.mode === 'campaign' ? 'k-entry__name k-entry__name--level' : 'k-entry__name'}>
            {nameOf(attempt)}
          </span>{' '}
          <span className="k-entry__outcome">{name}</span>{' '}
          <span className="k-entry__details">
            {gameHistoryTexts.kinds[kindOf(attempt)]} · {details(attempt)}
          </span>{' '}
          <span className="k-entry__meta">
            <time dateTime={attempt.finishedAt}>{formatShortDateTime(attempt.finishedAt)}</time>{' '}
            <StatusBadge status={status} />
          </span>
        </span>
      </EntryLink>
    </li>
  );
}
