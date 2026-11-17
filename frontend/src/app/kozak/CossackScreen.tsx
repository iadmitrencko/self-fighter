import { useCallback, useId, type CSSProperties } from 'react';
import { Link } from 'react-router';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import { dayStreak, localDate } from '../../domain/kozak/calendar';
import type { Standing } from '../../domain/kozak/ranks';
import { totalTally, weekDays, weekTotals, type DayReps, type GameRecord } from '../../domain/kozak/record';
import { formatCount, formatDay, formatWeekday } from '../../i18n/format';
import { cossackTexts, lookTexts, rankNames } from '../../i18n/kozak';
import type { CurrentUser } from '../../storage/contract';
import { Title } from '../components/Screen';
import { useGame } from '../game';
import { useLoad } from '../useLoad';
import { CossackFigure } from './art/Cossack';
import { Legend } from './Legend';
import { kozakPaths } from './paths';
import { Bar, KozakIcon, KozakScreen, WithCossack } from './parts';
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
                    <span className="k-hero__rank-line">
                      <span className="k-hero__label">{cossackTexts.rank}</span>{' '}
                      <span className="k-hero__rank">{rankNames[standing.rank.id]}</span>
                    </span>
                  </Title>
                  <Streak days={record.days} today={today} />
                </div>
                <Glory glory={glory} standing={standing} />
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
            <div className="k-stats">
              <Physical record={record} today={today} exercises={exercises} customFailed={custom.status === 'failed'} />
              <Week days={weekDays(record, today)} today={today} />
            </div>
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

// «★ 3 з 10 слави», the next rank and the bar of the way there. As on the page of the ranks, the
// bar shows the glory out of what the next rank needs. The next rank leads to that page, where all
// the ranks stand with what brings glory.
function Glory({ glory, standing: { next } }: { glory: number; standing: Standing }) {
  return (
    <div className="k-glory">
      <div className="k-glory__top">
        <p className="k-glory__value">
          <KozakIcon name="glory" className="k-glory__icon" />
          {next === null ? (
            <span>
              <b className="k-glory__number">{formatCount(glory)}</b> {cossackTexts.gloryWord(glory)}
            </span>
          ) : (
            <span>
              <b className="k-glory__number">{formatCount(glory)}</b> {cossackTexts.of} {formatCount(next.glory)}{' '}
              {cossackTexts.gloryWord(next.glory)}
            </span>
          )}
        </p>
        {next === null ? (
          <p className="k-glory__next">{cossackTexts.top}</p>
        ) : (
          <Link className="k-glory__next k-glory__link" to={kozakPaths.ranks}>
            {cossackTexts.next} <strong>{rankNames[next.id]}</strong>
            <KozakIcon name="forward" className="k-glory__arrow" />
          </Link>
        )}
      </div>
      {next === null ? (
        <Bar value={glory} max={glory} label={cossackTexts.top} />
      ) : (
        <Bar value={glory} max={next.glory} label={cossackTexts.toNext(next.glory - glory, rankNames[next.id])} />
      )}
    </div>
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
          <li key={outcome} className={`k-score__count k-score__count--${outcome}`}>
            <b className="k-score__number">{formatCount(count)}</b> <span className="k-score__word">{word}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * §24.10: the largest set, the repetitions of the last seven days and every repetition of each
 * exercise of the player, the ready-made ones and their own, whatever battle did them, a row for
 * each. A new exercise of the player shows at once. A narrow card puts the exercise over its
 * numbers, so the roles keep the table a table for a screen reader whatever its layout.
 */
function Physical({
  record,
  today,
  exercises,
  customFailed,
}: {
  record: GameRecord;
  today: string;
  exercises: readonly ExerciseRef[];
  customFailed: boolean;
}) {
  const titleId = useId();
  const week = weekTotals(record, today);

  return (
    <section className="k-card k-physical" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-section-title">
        <KozakIcon name="strength" className="k-section-title__icon" />
        {cossackTexts.physical}
      </h2>
      {customFailed && <p className="notice notice--warning">{cossackTexts.customFailed}</p>}
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
          {exercises.map(({ id, name }) => {
            const totals = record.exercises[id];

            return (
              <tr key={id} role="row">
                <th scope="row" role="rowheader">
                  {name}
                </th>
                <td role="cell">{totals === undefined ? <None /> : formatCount(totals.best)}</td>
                <td role="cell">{formatCount(week[id] ?? 0)}</td>
                <td role="cell">{formatCount(totals?.total ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// A dash for a record not set yet; a screen reader says so in words.
function None() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{cossackTexts.physicalNone}</span>
    </>
  );
}

/**
 * §24.10: every repetition of each of the last seven days, a column for a day and today the last.
 * One series needs no legend: the title names it. The peak carries its number, the axis the scale,
 * and every column tells its day and number on hover, on focus and to a screen reader.
 */
function Week({ days, today }: { days: readonly DayReps[]; today: string }) {
  const titleId = useId();
  const total = days.reduce((sum, { reps }) => sum + reps, 0);
  const most = Math.max(...days.map(({ reps }) => reps));
  const top = axisTop(most);
  const peak = days.findLast(({ reps }) => reps === most)?.date;

  return (
    <section className="k-card k-week" aria-labelledby={titleId}>
      <div className="k-week__head">
        <h2 id={titleId} className="k-section-title">
          <KozakIcon name="chart" className="k-section-title__icon" />
          {cossackTexts.week}
        </h2>
        <p className="k-week__total">
          <b>{formatCount(total)}</b> {cossackTexts.reps(total)}
        </p>
      </div>
      {total === 0 ? (
        <p className="k-card__text">{cossackTexts.weekEmpty}</p>
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

// The top of the axis: a round number at or over the most, whose half is a whole number as well.
function axisTop(most: number): number {
  const scale = 10 ** Math.floor(Math.log10(Math.max(most, 1)));
  const steps = scale === 1 ? [2, 4, 6, 8, 10] : [1, 2, 4, 6, 8, 10];

  return steps.map((step) => step * scale).find((top) => top >= most) ?? 10 * scale;
}
