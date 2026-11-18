import { useCallback, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import { dayStreak, localDate } from '../../domain/kozak/calendar';
import { totalTally, weekDays, weekTotals, type DayReps, type GameRecord } from '../../domain/kozak/record';
import { formatCount, formatDay, formatWeekday } from '../../i18n/format';
import { cossackTexts, lookTexts, rankNames } from '../../i18n/kozak';
import type { CurrentUser } from '../../storage/contract';
import { Title } from '../components/Screen';
import { useGame } from '../game';
import { useLoad } from '../useLoad';
import { CossackFigure } from './art/Cossack';
import { Glory } from './Glory';
import { Legend } from './Legend';
import { kozakPaths } from './paths';
import { KozakIcon, KozakScreen, WithCossack, WithIcon } from './parts';
import { useNow } from './record';

/**
 * §24.1–§24.3, §24.7, §24.10–§24.12: the cossack of the player at full height with his name, rank,
 * the way to the next rank, the days in a row with a battle and his record of battles; the ways to
 * a fight and to the journey; and what he has done of every exercise, in all and in the last seven
 * days. The header of the game shows the energy, so this screen leaves it out. The one who defeated
 * the King of robbers carries the title and the trophy of the legend as well (§24.9).
 */
export function CossackScreen() {
  const { storage, exercises: readyMade, timeZone } = useGame();
  const today = localDate(useNow(), timeZone);
  const listCustom = useCallback(() => storage.exercises.list(), [storage]);
  const [custom] = useLoad(listCustom);
  const loadUser = useCallback(() => storage.account.current(), [storage]);
  const [user] = useLoad(loadUser);
  // Until the exercises of the player arrive, the ready-made ones show alone.
  const exercises: readonly ExerciseRef[] = custom.status === 'ready' ? [...readyMade, ...custom.value] : readyMade;
  const name = user.status === 'ready' ? nameOf(user.value) : null;

  return (
    <KozakScreen title={cossackTexts.title} className="k-cossack">
      <WithCossack>
        {({ glory, standing, record, progress }) => (
          <>
            <section className="k-hero">
              <figure className="k-hero__portrait">
                <CossackFigure look={standing.look} label={lookTexts[standing.look].figure} />
              </figure>
              <div className="k-hero__body">
                <div className="k-hero__top">
                  <Title className="k-hero__title">
                    {name !== null && (
                      <>
                        {/* The comma gives a screen reader a pause between the name and the rank. */}
                        <span className="k-hero__name">
                          {name}
                          <span className="visually-hidden">,</span>
                        </span>{' '}
                      </>
                    )}
                    {/* The rank speaks for itself on the screen; a screen reader still hears what it is. */}
                    <span className="visually-hidden">{cossackTexts.rank}</span>{' '}
                    <span className="k-hero__rank">{rankNames[standing.rank.id]}</span>
                  </Title>
                  <Streak days={record.days} today={today} />
                </div>
                <Glory glory={glory} standing={standing} to={kozakPaths.ranks} />
                <Score record={record} />
                {/* §24.1: «Грати» of the site leads here. With no energy the hall of fights and the
                    level close the start themselves and say when a unit comes back. */}
                <div className="k-hero__actions">
                  <Link className="k-button k-button--primary k-button--large" to={kozakPaths.fight}>
                    {cossackTexts.toFight}
                  </Link>
                  <Link className="k-button k-button--secondary k-button--large" to={kozakPaths.journey}>
                    {cossackTexts.toJourney}
                  </Link>
                </div>
              </div>
            </section>
            <Stats record={record} today={today} exercises={exercises} customFailed={custom.status === 'failed'} />
            {progress.done && <Legend at={record.duelAt} />}
          </>
        )}
      </WithCossack>
    </KozakScreen>
  );
}

// §24.11: the name the player gave the cossack, or else the one Google gave an account.
function nameOf(user: CurrentUser | null): string | null {
  if (user === null) {
    return null;
  }

  return user.nickname ?? (user.kind === 'account' ? user.name : null);
}

// §24.12: the days in a row with a battle. A run without a battle today yet asks to go on with it.
function Streak({ days, today }: { days: readonly string[]; today: string }) {
  const streak = dayStreak(days, today);

  if (streak.days === 0) {
    return null;
  }

  return (
    <p className={streak.today ? 'k-streak' : 'k-streak k-streak--waiting'}>
      <KozakIcon name="flame" className="k-streak__icon" />
      <span className="k-streak__text">
        {cossackTexts.streak(streak.days)}
        {!streak.today && (
          <>
            <span className="visually-hidden">, </span>
            <span className="k-streak__hint">{cossackTexts.streakToday}</span>
          </>
        )}
      </span>
    </p>
  );
}

// §24.7: every battle of the game, fights and levels alike, in large numbers over their words.
function Score({ record }: { record: GameRecord }) {
  const titleId = useId();
  const { wins, draws, losses } = totalTally(record);
  const counts = [
    { outcome: 'win', count: wins, word: cossackTexts.wins(wins) },
    { outcome: 'draw', count: draws, word: cossackTexts.draws(draws) },
    { outcome: 'loss', count: losses, word: cossackTexts.losses(losses) },
  ] as const;

  return (
    <section className="k-score" aria-labelledby={titleId}>
      <h2 id={titleId} className="visually-hidden">
        {cossackTexts.record}
      </h2>
      <ul className="k-score__counts" role="list">
        {counts.map(({ outcome, count, word }) => (
          <li key={outcome} className="k-score__count">
            <b className="k-score__number">{formatCount(count)}</b> <span className="k-score__word">{word}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface StatsProps {
  record: GameRecord;
  today: string;
  exercises: readonly ExerciseRef[];
  customFailed: boolean;
}

/**
 * §24.10: what the cossack has done, the table of the exercises beside the chart of the last seven
 * days. An exercise of the table switches the chart to itself alone, until it is pressed again or
 * the chart goes back to every exercise. Before the first set done one card says what will stand
 * here, instead of a table of zeros and an empty chart.
 */
function Stats({ record, today, exercises, customFailed }: StatsProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const chartId = useId();
  const chart = useRef<HTMLElement>(null);

  if (Object.keys(record.exercises).length === 0) {
    return <StatsEmpty />;
  }

  // An exercise of the player deleted meanwhile gives the chart back to every exercise.
  const exercise = exercises.find(({ id }) => id === chosen) ?? null;
  const choose = (id: string) => {
    setChosen(id === exercise?.id ? null : id);
    // A narrow screen puts the chart under the table, so it comes into view to show the change.
    chart.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  };

  return (
    <div className="k-stats">
      <Physical
        record={record}
        today={today}
        exercises={exercises}
        customFailed={customFailed}
        chosen={exercise?.id ?? null}
        chartId={chartId}
        onChoose={choose}
      />
      <Week
        id={chartId}
        sectionRef={chart}
        days={weekDays(record, today, exercise?.id ?? null)}
        today={today}
        exercise={exercise}
        onAll={() => setChosen(null)}
      />
    </div>
  );
}

// A smooth scroll, unless the player asked the system for less motion.
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// Before the first set done: what the table and the chart will show.
function StatsEmpty() {
  const titleId = useId();

  return (
    <section className="k-card k-stats__empty" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-section-title">
        <KozakIcon name="strength" className="k-section-title__icon" />
        {cossackTexts.physical}
      </h2>
      <p className="k-card__text">{cossackTexts.physicalEmpty}</p>
    </section>
  );
}

/**
 * §24.10: the largest set, the repetitions of the last seven days and every repetition of each
 * exercise the cossack has done, the ready-made ones and the player's own, whatever battle did them,
 * a row for each; an exercise without a single repetition stays out. A narrow card puts the exercise
 * over its numbers, so the roles keep the table a table for a screen reader whatever its layout.
 * Each exercise is a switch of the chart beside the table.
 */
function Physical({
  record,
  today,
  exercises,
  customFailed,
  chosen,
  chartId,
  onChoose,
}: StatsProps & { chosen: string | null; chartId: string; onChoose: (exercise: string) => void }) {
  const titleId = useId();
  const pickId = useId();
  const week = weekTotals(record, today);
  const done = exercises.flatMap(({ id, name }) => {
    const totals = record.exercises[id];

    return totals === undefined || totals.total === 0 ? [] : [{ id, name, totals }];
  });

  return (
    <section className="k-card k-physical" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-section-title">
        <KozakIcon name="strength" className="k-section-title__icon" />
        {cossackTexts.physical}
      </h2>
      {customFailed && <p className="notice notice--warning">{cossackTexts.customFailed}</p>}
      {/* Nothing to show only while the exercises of the player are on their way, or once they are gone. */}
      {done.length > 0 && (
        <table className="k-physical__table" role="table" aria-labelledby={titleId}>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                {cossackTexts.physicalExercise}
              </th>
              <th scope="col" role="columnheader">
                {cossackTexts.physicalBest}
              </th>
              <th scope="col" role="columnheader">
                {cossackTexts.physicalWeek}
              </th>
              <th scope="col" role="columnheader">
                {cossackTexts.physicalTotal}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {done.map(({ id, name, totals }) => {
              const pressed = id === chosen;

              return (
                <tr key={id} role="row" className={pressed ? 'k-physical__row k-physical__row--chosen' : 'k-physical__row'}>
                  <th scope="row" role="rowheader">
                    <button
                      type="button"
                      className="k-physical__pick"
                      aria-pressed={pressed}
                      aria-controls={chartId}
                      aria-describedby={pickId}
                      onClick={() => onChoose(id)}
                    >
                      <span className="k-physical__name">
                        <WithIcon text={name} className="k-physical__tail">
                          <KozakIcon name="chart" className="k-physical__chart" />
                        </WithIcon>
                      </span>
                    </button>
                  </th>
                  <td role="cell">{formatCount(totals.best)}</td>
                  <td role="cell">{formatCount(week[id] ?? 0)}</td>
                  <td role="cell">{formatCount(totals.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p id={pickId} hidden>
        {cossackTexts.weekPick}
      </p>
    </section>
  );
}

/**
 * §24.10: the repetitions of each of the last seven days, of every exercise or of the one chosen in
 * the table, a column for a day and today the last. One series needs no legend: the title names it.
 * The peak carries its number, the axis the scale, and every column tells its day and number on
 * hover, on focus and to a screen reader.
 */
function Week({
  id,
  sectionRef,
  days,
  today,
  exercise,
  onAll,
}: {
  id: string;
  sectionRef: RefObject<HTMLElement | null>;
  days: readonly DayReps[];
  today: string;
  exercise: ExerciseRef | null;
  onAll: () => void;
}) {
  const titleId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const total = days.reduce((sum, { reps }) => sum + reps, 0);
  const most = Math.max(...days.map(({ reps }) => reps));
  const top = axisTop(most);
  const peak = days.findLast(({ reps }) => reps === most)?.date;
  const all = () => {
    onAll();
    // The button leaves with the choice, so the focus stays on the chart, at its title.
    title.current?.focus();
  };

  return (
    <section ref={sectionRef} id={id} className="k-card k-week" aria-labelledby={titleId}>
      <div className="k-week__head">
        <h2 ref={title} id={titleId} className="k-section-title k-week__title" tabIndex={-1}>
          <KozakIcon name="chart" className="k-section-title__icon" />
          {exercise === null ? (
            cossackTexts.week
          ) : (
            // «за 7 днів» keeps together where a long exercise breaks the title.
            <span>
              {exercise.name} <span className="k-week__for">{cossackTexts.weekFor}</span>
            </span>
          )}
        </h2>
        <div className="k-week__summary">
          <p className="k-week__total">
            <b>{formatCount(total)}</b> {cossackTexts.reps(total)}
          </p>
          {exercise !== null && (
            <button type="button" className="k-week__all" onClick={all}>
              <KozakIcon name="close" className="k-week__all-icon" />
              {cossackTexts.weekAll}
            </button>
          )}
        </div>
      </div>
      {total === 0 ? (
        <p className="k-card__text">{exercise === null ? cossackTexts.weekEmpty : cossackTexts.weekNone}</p>
      ) : (
        <div className="k-week__chart">
          <div className="k-week__axis" aria-hidden="true">
            {[top, top / 2, 0].map((tick) => (
              <span key={tick} className="k-week__tick">
                {formatCount(tick)}
              </span>
            ))}
          </div>
          <ol className="k-week__days" role="list">
            {days.map(({ date, reps }) => (
              <li
                key={date}
                className={date === today ? 'k-week__day k-week__day--today' : 'k-week__day'}
                // A column tells its number on focus too, not only under the pointer.
                tabIndex={0}
                aria-label={`${formatDay(date)}: ${cossackTexts.dayReps(reps)}`}
              >
                <span className="k-week__plot" aria-hidden="true">
                  <span className="k-week__bar" style={{ '--share': `${(reps / top) * 100}%` } as CSSProperties}>
                    {date === peak && <span className="k-week__value">{formatCount(reps)}</span>}
                  </span>
                </span>
                <span className="k-week__label" aria-hidden="true">
                  {formatWeekday(date)}
                </span>
                <span className="k-week__tip" aria-hidden="true">
                  <b>{cossackTexts.dayReps(reps)}</b> <span>{formatDay(date)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// The top of the axis: the nearest round number at or over the most, whose half is a whole number
// as well, so the best day fills most of the height: 300 for 215, not 400.
function axisTop(most: number): number {
  const scale = 10 ** Math.floor(Math.log10(Math.max(most, 1)));
  const steps = scale === 1 ? [2, 4, 6, 8, 10] : [1, 2, 3, 4, 5, 6, 8, 10];

  return steps.map((step) => step * scale).find((top) => top >= most) ?? 10 * scale;
}
