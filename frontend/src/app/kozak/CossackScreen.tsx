import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { SICH } from '../../domain/kozak/journey';
import { bestSets, totalTally } from '../../domain/kozak/record';
import { Legend } from './Legend';
import { campaignTexts, cossackTexts, lookTexts, rankNames } from '../../i18n/kozak';
import { Title } from '../components/Screen';
import { CossackFigure } from './art/Cossack';
import { kozakPaths } from './paths';
import { Bar, EnergyMeter, GloryRewards, KozakIcon, KozakScreen, WithCossack } from './parts';
import { useNow } from './record';

// §24.1–§24.4, §24.8, resesign/kozak.html: the cossack of the player, his glory, energy, record and
// the best sets of the journey, and the way to the next battle. The one who defeated the King of
// robbers carries the title and the trophy of the legend as well (§24.9).
export function CossackScreen() {
  const now = useNow();
  const recordId = useId();
  const bestId = useId();

  return (
    <KozakScreen title={cossackTexts.title} className="k-cossack">
      <WithCossack>
        {({ glory, standing, record, energy, progress }) => {
          const tally = totalTally(record);
          const { next } = standing;

          return (
            <>
              <section className="k-hero">
                <figure className="k-hero__portrait">
                  <CossackFigure look={standing.look} label={lookTexts[standing.look].figure} />
                </figure>
                <div className="k-hero__body">
                  <Title className="k-hero__title">
                    <span className="k-hero__label">{cossackTexts.rank}</span>{' '}
                    <span className="k-hero__rank">{rankNames[standing.rank.id]}</span>
                  </Title>
                  <div className="k-glory">
                    <div className="k-glory__top">
                      <p className="k-glory__value">
                        <KozakIcon name="glory" className="k-glory__icon" />
                        <b className="k-glory__number">{glory}</b> <span>{cossackTexts.gloryWord(glory)}</span>
                      </p>
                      <GloryHelp />
                    </div>
                    {next === null ? (
                      <p className="k-glory__next">{cossackTexts.top}</p>
                    ) : (
                      <>
                        {/* As on the page of the ranks: the glory out of what the next rank needs. */}
                        <Bar value={glory} max={next.glory} label={cossackTexts.toNext(next.glory - glory, rankNames[next.id])} />
                        <p className="k-glory__next">
                          {cossackTexts.toNextBefore} <strong>{cossackTexts.toNextAmount(next.glory - glory)}</strong>{' '}
                          {cossackTexts.toNextAfter(rankNames[next.id])}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="k-hero__energy">
                    <EnergyMeter pool="fight" energy={energy('fight', now)} now={now} compact />
                    <EnergyMeter pool="campaign" energy={energy('campaign', now)} now={now} compact />
                  </div>
                  <div className="k-hero__actions">
                    <Link className="k-action k-action--primary" to={kozakPaths.fight}>
                      <span className="k-action__name">{cossackTexts.fight}</span>
                      <span className="k-action__cost">{cossackTexts.fightCost}</span>
                    </Link>
                    <Link className="k-action" to={kozakPaths.journey}>
                      <span className="k-action__name">{cossackTexts.journey}</span>
                      <span className="k-action__cost">{cossackTexts.journeyCost}</span>
                    </Link>
                  </div>
                </div>
              </section>
              <section className="k-record" aria-labelledby={recordId}>
                <h2 id={recordId} className="k-record__title">
                  {cossackTexts.record}
                </h2>
                <p className="k-record__counts">
                  <span>
                    <strong>{tally.wins}</strong> {cossackTexts.wins(tally.wins)}
                  </span>
                  <span>
                    <strong>{tally.draws}</strong> {cossackTexts.draws(tally.draws)}
                  </span>
                  <span>
                    <strong>{tally.losses}</strong> {cossackTexts.losses(tally.losses)}
                  </span>
                </p>
                <Link className="k-record__link" to={kozakPaths.history}>
                  {cossackTexts.history} <span aria-hidden="true">→</span>
                </Link>
              </section>
              <section className="k-record" aria-labelledby={bestId}>
                <h2 id={bestId} className="k-record__title">
                  {cossackTexts.best}
                </h2>
                <dl className="k-best">
                  {bestSets(SICH, record).map(({ campaign, reps }) => (
                    <div key={campaign} className="k-best__item">
                      <dt className="k-best__exercise">{campaignTexts[campaign].exercise}</dt>
                      <dd className="k-best__reps">
                        {reps === null ? (
                          <>
                            <span className="k-best__number" aria-hidden="true">
                              —
                            </span>
                            <span className="visually-hidden">{cossackTexts.bestNone}</span>
                          </>
                        ) : (
                          <>
                            <strong className="k-best__number">{reps}</strong> {cossackTexts.bestUnit}
                          </>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              {progress.done && <Legend at={record.duelAt} />}
            </>
          );
        }}
      </WithCossack>
    </KozakScreen>
  );
}

// «?» beside the glory: what brings it, in a small panel that closes on Escape or a tap elsewhere.
function GloryHelp() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // On a phone the panel may open below the edge of the screen.
    panel.current?.scrollIntoView({ block: 'nearest' });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && box.current?.contains(event.target) === true)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={box} className="k-help">
      <button
        ref={button}
        type="button"
        className="k-help__button"
        aria-label={cossackTexts.help}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      <div ref={panel} id={panelId} className="k-help__panel" role="region" aria-label={cossackTexts.help} hidden={!open}>
        <p className="k-help__title">{cossackTexts.help}</p>
        <GloryRewards />
      </div>
    </div>
  );
}
