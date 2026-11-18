import { useId } from 'react';
import { Link } from 'react-router';
import { rankGroups, type RankGroup, type Standing } from '../../domain/kozak/ranks';
import { gloryRewards, lookTexts, rankNames, ranksTexts } from '../../i18n/kozak';
import { Title } from '../components/Screen';
import { Glory } from './Glory';
import { kozakPaths } from './paths';
import { KozakIcon, KozakScreen, WithCossack } from './parts';

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
              {/* As on the screen of the cossack, without the way to this very page. */}
              <Glory glory={glory} standing={standing} />
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

// §24.3: what brings glory.
function GloryRewards() {
  return (
    <dl className="k-how">
      {gloryRewards.map(([what, amount]) => (
        <div key={what} className="k-how__item">
          <dt>{what}</dt>
          <dd>{amount}</dd>
        </div>
      ))}
    </dl>
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
