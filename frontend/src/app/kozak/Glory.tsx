import { Link } from 'react-router';
import type { Standing } from '../../domain/kozak/ranks';
import { formatCount } from '../../i18n/format';
import { gloryTexts, rankNames } from '../../i18n/kozak';
import { Bar, KozakIcon, WithIcon } from './parts';

/**
 * §24.2: «★ 11 слави», the glory of the cossack, and «Ще 14 слави до звання «Ройовий»» beside it,
 * over the bar of the way to that rank from the one he holds: an empty bar is a rank just taken, a
 * full one the next rank. The screen of the cossack leads from the way to the page of the ranks,
 * where all the ranks stand with what brings glory.
 */
export function Glory({ glory, standing: { rank, next }, to }: { glory: number; standing: Standing; to?: string }) {
  return (
    <div className="k-glory">
      <div className="k-glory__head">
        <p className="k-glory__value">
          <KozakIcon name="glory" className="k-glory__icon" />
          <b className="k-glory__number">{formatCount(glory)}</b> {gloryTexts.word(glory)}
        </p>
        {next === null ? (
          <p className="k-glory__next">{gloryTexts.top}</p>
        ) : to === undefined ? (
          <p className="k-glory__next">
            <Left left={next.glory - glory} rank={rankNames[next.id]} />
          </p>
        ) : (
          <Link className="k-glory__next k-glory__link" to={to}>
            <Left left={next.glory - glory} rank={rankNames[next.id]} arrow />
          </Link>
        )}
      </div>
      {next === null ? (
        <Bar value={glory} max={glory} label={gloryTexts.top} />
      ) : (
        <Bar value={glory} min={rank.glory} max={next.glory} label={gloryTexts.progress(rankNames[next.id])} />
      )}
    </div>
  );
}

// «Ще 14 слави до звання «Ройовий»»: the number and the rank stand out of the words, and «звання» keeps
// to the rank, which may break between its words on a narrow phone. The arrow of a way that leads on
// keeps to the last word, so it never starts a line alone.
function Left({ left, rank, arrow = false }: { left: number; rank: string; arrow?: boolean }) {
  const quoted = gloryTexts.quoted(rank);

  return (
    <>
      {gloryTexts.more} <b>{formatCount(left)}</b> {gloryTexts.word(left)} {gloryTexts.toRank}
      {'\u00a0'}
      <strong>
        {arrow ? (
          <WithIcon text={quoted} className="k-glory__tail">
            <KozakIcon name="forward" className="k-glory__arrow" />
          </WithIcon>
        ) : (
          quoted
        )}
      </strong>
    </>
  );
}
