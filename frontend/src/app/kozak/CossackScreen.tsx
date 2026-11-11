import { useId } from 'react';
import { lookOf, RANKS } from '../../domain/kozak/ranks';
import { totalTally } from '../../domain/kozak/record';
import { cossackTexts, kozakTexts, lookTexts, rankNames } from '../../i18n/kozak';
import { Title } from '../components/Screen';
import { CossackFigure } from './art/Cossack';
import { Bar, EnergyMeter, KozakIcon, KozakScreen, WithCossack } from './parts';
import { useNow } from './record';

// §24.1–§24.4: the cossack of the player: his look and rank, his glory, his record and energy.
export function CossackScreen() {
  const now = useNow();
  const recordId = useId();
  const energyId = useId();
  const ranksId = useId();
  const howId = useId();

  return (
    <KozakScreen title={cossackTexts.eyebrow} className="k-cossack">
      <WithCossack>
        {({ glory, standing, record, energy }) => {
          const look = lookTexts[standing.look];
          const tally = totalTally(record);
          const name = rankNames[standing.rank.id];
          const from = standing.rank.glory;
          const to = standing.next?.glory ?? from;

          return (
            <>
              <header className="k-head">
                <p className="k-eyebrow">{cossackTexts.eyebrow}</p>
                <Title className="k-title">{name}</Title>
                <p className="k-lead">{cossackTexts.rankNumber(standing.number, RANKS.length)}</p>
              </header>
              <div className="k-cossack__body">
                <figure className="k-cossack__portrait">
                  <CossackFigure look={standing.look} label={look.figure} />
                  <figcaption className="k-cossack__look">
                    <span className="k-eyebrow">{cossackTexts.look}</span>
                    <b>{look.ranks}</b>
                    <span>{look.text}</span>
                  </figcaption>
                </figure>
                <div className="k-cossack__facts">
                  <section className="k-card k-glory">
                    <p className="k-glory__label">{kozakTexts.glory}</p>
                    <p className="k-glory__value">
                      <KozakIcon name="glory" className="k-glory__icon" />
                      {glory}
                    </p>
                    {standing.next === null ? (
                      <p className="k-glory__next">{cossackTexts.top}</p>
                    ) : (
                      <>
                        <Bar value={glory - from} max={to - from} label={cossackTexts.toNext(to - glory, rankNames[standing.next.id])} />
                        <p className="k-glory__next">{cossackTexts.toNext(to - glory, rankNames[standing.next.id])}</p>
                      </>
                    )}
                  </section>
                  <section className="k-card" aria-labelledby={recordId}>
                    <h2 id={recordId} className="k-card__title">
                      {cossackTexts.record}
                    </h2>
                    <dl className="k-tally">
                      <div className="k-tally__item k-tally__item--wins">
                        <dt>{cossackTexts.wins}</dt>
                        <dd>{tally.wins}</dd>
                      </div>
                      <div className="k-tally__item">
                        <dt>{cossackTexts.draws}</dt>
                        <dd>{tally.draws}</dd>
                      </div>
                      <div className="k-tally__item k-tally__item--losses">
                        <dt>{cossackTexts.losses}</dt>
                        <dd>{tally.losses}</dd>
                      </div>
                    </dl>
                    <p className="k-card__note">{cossackTexts.recordNote}</p>
                  </section>
                  <section className="k-card" aria-labelledby={energyId}>
                    <h2 id={energyId} className="k-card__title">
                      {cossackTexts.energy}
                    </h2>
                    <div className="k-energies">
                      <EnergyMeter pool="fight" energy={energy('fight', now)} now={now} />
                      <EnergyMeter pool="campaign" energy={energy('campaign', now)} now={now} />
                    </div>
                    <p className="k-card__note">{cossackTexts.energyNote}</p>
                  </section>
                </div>
              </div>
              <div className="k-cossack__more">
                <section className="k-card" aria-labelledby={ranksId}>
                  <h2 id={ranksId} className="k-card__title">
                    {cossackTexts.ranks}
                  </h2>
                  <p className="k-card__note">{cossackTexts.ranksNote}</p>
                  <ol className="k-ranks" role="list">
                    {RANKS.map((rank, index) => {
                      const state = index + 1 < standing.number ? 'done' : index + 1 === standing.number ? 'current' : 'next';
                      const newLook = index === 0 || lookOf(rank.id) !== lookOf(RANKS[index - 1]?.id ?? rank.id);

                      return (
                        <li
                          key={rank.id}
                          className={`k-ranks__item k-ranks__item--${state}${newLook ? ' k-ranks__item--look' : ''}`}
                          aria-current={state === 'current' ? 'step' : undefined}
                        >
                          <span className="k-ranks__mark" aria-hidden="true">
                            {state === 'done' ? <KozakIcon name="check" className="k-ranks__check" /> : index + 1}
                          </span>
                          <span className="k-ranks__name">{rankNames[rank.id]}</span>
                          <span className="k-ranks__glory">
                            {state === 'current' ? cossackTexts.current : cossackTexts.rankGlory(rank.glory)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
                <section className="k-card" aria-labelledby={howId}>
                  <h2 id={howId} className="k-card__title">
                    {cossackTexts.howTitle}
                  </h2>
                  <dl className="k-how">
                    {cossackTexts.how.map(([what, amount]) => (
                      <div key={what} className="k-how__item">
                        <dt>{what}</dt>
                        <dd>{amount}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </>
          );
        }}
      </WithCossack>
    </KozakScreen>
  );
}
