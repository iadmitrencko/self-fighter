import { useId } from 'react';
import { Link } from 'react-router';
import { rankGroups, type RankGroup, type Standing } from '../../domain/kozak/ranks';
import { lookTexts, rankNames, ranksTexts } from '../../i18n/kozak';
import { Title } from '../components/Screen';
import { kozakPaths } from './paths';
import { Bar, GloryRewards, KozakIcon, KozakScreen, WithCossack } from './parts';

const GROUPS = rankGroups();

type RankState = 'done' | 'current' | 'next' | 'later';

// §24.2, resesign/zvannya.html: every rank by the look it gives, and the way to the next one.
export function RanksScreen() {
  const progressId = useId();
  const howId = useId();

  return (
    <KozakScreen title={ranksTexts.title} className="k-ranks-screen">
      <header className="k-head">
        <Title className="k-title">{ranksTexts.title}</Title>
        <p className="k-lead">{ranksTexts.lead}</p>
      </header>
      <WithCossack>
        {({ glory, standing }) => (
          <div className="k-ranks-layout">
            <section className="k-card k-progress" aria-labelledby={progressId}>
              <h2 id={progressId} className="k-card__label">
                {ranksTexts.progress}
              </h2>
              <p className="k-progress__value">
                <KozakIcon name="glory" className="k-progress__icon" />
                <b>{glory}</b>{' '}
                <span>
                  {standing.next === null
                    ? ranksTexts.top
                    : ranksTexts.toward(standing.next.glory, rankNames[standing.next.id])}
                </span>
              </p>
              {standing.next !== null && (
                <Bar
                  value={glory}
                  max={standing.next.glory}
                  label={ranksTexts.towardLabel(glory, standing.next.glory, rankNames[standing.next.id])}
                />
              )}
              <Link className="k-progress__back" to={kozakPaths.cossack}>
                <span aria-hidden="true">←</span> {ranksTexts.toCossack}
              </Link>
            </section>
            <section className="k-ladder" aria-label={ranksTexts.all}>
              {GROUPS.map((group) => (
                <RankGroupCard key={group.look} group={group} glory={glory} standing={standing} />
              ))}
            </section>
            <section className="k-card k-rewards" aria-labelledby={howId}>
              <h2 id={howId} className="k-card__title">
                {ranksTexts.howTitle}
              </h2>
              <GloryRewards />
            </section>
          </div>
        )}
      </WithCossack>
    </KozakScreen>
  );
}

function stateOf(number: number, standing: Standing): RankState {
  if (number < standing.number) {
    return 'done';
  }
  if (number === standing.number) {
    return 'current';
  }

  return number === standing.number + 1 ? 'next' : 'later';
}

function RankGroupCard({ group, glory, standing }: { group: RankGroup; glory: number; standing: Standing }) {
  const titleId = useId();

  return (
    <section className="k-rank-group" aria-labelledby={titleId}>
      <div className="k-rank-group__head">
        <h2 id={titleId} className="k-rank-group__title">
          {lookTexts[group.look].group}
        </h2>
        <span className="k-rank-group__range">{ranksTexts.range(group.first, group.last)}</span>
      </div>
      {/* list-style: none takes the list away from VoiceOver in Safari; the role brings it back. */}
      <ol className="k-rank-list" role="list">
        {group.ranks.map((rank, index) => {
          const number = group.first + index;
          const state = stateOf(number, standing);

          return (
            <li key={rank.id} className={`k-rank k-rank--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="k-rank__number" aria-hidden="true">
                {state === 'done' ? <KozakIcon name="check" className="k-rank__check" /> : number}
              </span>
              <span className="k-rank__name">
                <span className="visually-hidden">{ranksTexts.number(number)}</span>
                {rankNames[rank.id]}
              </span>
              <span className="k-rank__note">
                {state === 'current'
                  ? ranksTexts.current
                  : state === 'next'
                    ? ranksTexts.left(rank.glory - glory)
                    : ranksTexts.from(rank.glory)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
