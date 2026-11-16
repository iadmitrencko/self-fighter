import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ExerciseRef } from '../../domain/catalog/exercise';
import type { Energy, EnergyPool } from '../../domain/kozak/energy';
import { SICH } from '../../domain/kozak/journey';
import type { Standing } from '../../domain/kozak/ranks';
import { bestSets, totalTally, type GameRecord } from '../../domain/kozak/record';
import { formatCount } from '../../i18n/format';
import {
  campaignTexts,
  cossackTexts,
  energyStatus,
  energyTexts,
  formatClock,
  formatWait,
  lookTexts,
  rankNames,
} from '../../i18n/kozak';
import { Title } from '../components/Screen';
import { useGame } from '../game';
import { useLoad } from '../useLoad';
import { CossackFigure } from './art/Cossack';
import { Legend } from './Legend';
import { kozakPaths } from './paths';
import { Bar, EnergyCells, GloryRewards, KozakIcon, KozakScreen, WithCossack, type KozakIconName } from './parts';
import { useNow } from './record';

/**
 * §24.1–§24.4, §24.7, §24.8, §24.10, resesign/kozak.html: the cossack of the player at full height
 * with his rank, glory and record of battles; a card for each pool of energy with the way to its
 * battles; and what he has done of every exercise. The one who defeated the King of robbers
 * carries the title and the trophy of the legend as well (§24.9).
 */
export function CossackScreen() {
  const now = useNow();
  const { storage, exercises: readyMade } = useGame();
  const listCustom = useCallback(() => storage.exercises.list(), [storage]);
  const [custom] = useLoad(listCustom);
  // Until the exercises of the player arrive, the ready-made ones show alone.
  const exercises: readonly ExerciseRef[] = custom.status === 'ready' ? [...readyMade, ...custom.value] : readyMade;

  return (
    <KozakScreen title={cossackTexts.title} className="k-cossack">
      <WithCossack>
        {({ glory, standing, record, energy, progress }) => (
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
                <Glory glory={glory} standing={standing} />
                <Score record={record} />
              </div>
            </section>
            <div className="k-pools">
              <PoolCard pool="fight" energy={energy('fight', now)} now={now}>
                <FightStats record={record} />
              </PoolCard>
              <PoolCard pool="campaign" energy={energy('campaign', now)} now={now}>
                <BestSets record={record} />
              </PoolCard>
            </div>
            <Physical record={record} exercises={exercises} customFailed={custom.status === 'failed'} />
            {progress.done && <Legend at={record.duelAt} />}
          </>
        )}
      </WithCossack>
    </KozakScreen>
  );
}

// «★ 3 / 10 слави», the next rank and «?» beside it, and the bar of the way there. As on the page
// of the ranks, the bar shows the glory out of what the next rank needs.
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
            <>
              <span aria-hidden="true">
                <b className="k-glory__number">{formatCount(glory)}</b> / {formatCount(next.glory)} {cossackTexts.gloryWord(next.glory)}
              </span>
              <span className="visually-hidden">{cossackTexts.gloryOf(glory, next.glory)}</span>
            </>
          )}
        </p>
        <p className="k-glory__next">
          {next === null ? (
            cossackTexts.top
          ) : (
            <>
              {cossackTexts.next} <strong>{rankNames[next.id]}</strong>
            </>
          )}
        </p>
        <GloryHelp />
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
    ['win', wins, cossackTexts.wins(wins)],
    ['draw', draws, cossackTexts.draws(draws)],
    ['loss', losses, cossackTexts.losses(losses)],
  ] as const;

  return (
    <section className="k-score" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-score__title">
        {cossackTexts.record}
      </h2>
      <ul className="k-score__counts" role="list">
        {counts.map(([outcome, count, word]) => (
          <li key={outcome} className={`k-score__count k-score__count--${outcome}`}>
            <b className="k-score__number">{formatCount(count)}</b> <span className="k-score__word">{word}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const POOLS: Readonly<Record<EnergyPool, { icon: KozakIconName; to: string; button: string }>> = {
  fight: { icon: 'fight', to: kozakPaths.fight, button: 'k-button--primary' },
  campaign: { icon: 'journey', to: kozakPaths.journey, button: 'k-button--secondary' },
};

// §24.4: a pool of energy, when its next unit comes back and the way to its battles, closed while
// the pool is empty. The two cards share a row, so their buttons stand on one line at the bottom.
function PoolCard({ pool, energy, now, children }: { pool: EnergyPool; energy: Energy; now: Date; children: ReactNode }) {
  const titleId = useId();
  const { icon, to, button } = POOLS[pool];
  const { title, action } = cossackTexts.pools[pool];
  const wait = energy.nextAt === null ? null : Date.parse(energy.nextAt) - now.getTime();
  const empty = energy.value === 0;

  return (
    <section className={empty ? 'k-card k-pool k-pool--empty' : 'k-card k-pool'} aria-labelledby={titleId}>
      <div className="k-pool__head">
        <h2 id={titleId} className="k-section-title">
          <KozakIcon name={icon} className="k-section-title__icon" />
          {title}
        </h2>
        <p className="k-pool__energy">
          <KozakIcon name="bolt" className="k-pool__bolt" />
          <span aria-hidden="true">{energyStatus.value(energy.value, energy.max)}</span>
          <span className="visually-hidden">{energyStatus.named(energyTexts[pool].name, energy.value, energy.max)}</span>
        </p>
      </div>
      <EnergyCells energy={energy} />
      {wait !== null && (
        <p className="k-pool__wait">
          <span aria-hidden="true">{energyStatus.countdown(formatClock(wait))}</span>
          <span className="visually-hidden">{energyStatus.countdown(formatWait(wait))}</span>
        </p>
      )}
      {children}
      {empty ? (
        <button type="button" className="k-button k-button--locked k-button--large k-pool__action" disabled>
          <KozakIcon name="lock" className="k-button__icon" />
          {action}
        </button>
      ) : (
        <Link className={`k-button ${button} k-button--large k-pool__action`} to={to}>
          {action}
        </Link>
      )}
    </section>
  );
}

// Three facts of a card in a row, each a word over its number.
function Facts({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="k-facts">
      <h3 className="k-facts__title">{title}</h3>
      <dl className="k-facts__list">{children}</dl>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="k-facts__item">
      <dt className="k-facts__label">{label}</dt>
      <dd className="k-facts__value">{children}</dd>
    </div>
  );
}

// §24.7: the fights of the game, those won and the run of wins going on now.
function FightStats({ record: { fights, fightStreak } }: { record: GameRecord }) {
  return (
    <Facts title={cossackTexts.fights}>
      <Fact label={cossackTexts.fought}>
        <strong className="k-facts__number">{formatCount(fights.wins + fights.draws + fights.losses)}</strong>
      </Fact>
      <Fact label={cossackTexts.fightWins}>
        <strong className="k-facts__number">{formatCount(fights.wins)}</strong>
      </Fact>
      <Fact label={cossackTexts.streak}>
        <strong className="k-facts__number">{formatCount(fightStreak)}</strong>
      </Fact>
    </Facts>
  );
}

// §24.8: the best set of every exercise of the journey, in the order of its campaigns.
function BestSets({ record }: { record: GameRecord }) {
  return (
    <Facts title={cossackTexts.best}>
      {bestSets(SICH, record).map(({ campaign, reps }) => (
        <Fact key={campaign} label={campaignTexts[campaign].exercise}>
          {reps === null ? (
            <None />
          ) : (
            <>
              <strong className="k-facts__number">{reps}</strong> <span className="k-facts__unit">{cossackTexts.bestUnit}</span>
            </>
          )}
        </Fact>
      ))}
    </Facts>
  );
}

// A dash for a record not set yet; a screen reader says so in words.
function None() {
  return (
    <>
      <span className="k-facts__number" aria-hidden="true">
        —
      </span>
      <span className="visually-hidden">{cossackTexts.bestNone}</span>
    </>
  );
}

/**
 * §24.10: the largest set and every repetition of each exercise of the player, the ready-made ones
 * and their own, whatever battle or workout did them. A new exercise of the player shows at once.
 */
function Physical({ record, exercises, customFailed }: { record: GameRecord; exercises: readonly ExerciseRef[]; customFailed: boolean }) {
  const titleId = useId();

  return (
    <section className="k-card k-physical" aria-labelledby={titleId}>
      <div className="k-physical__head">
        <h2 id={titleId} className="k-section-title">
          <KozakIcon name="strength" className="k-section-title__icon" />
          {cossackTexts.physical}
        </h2>
        <p className="k-physical__lead">{cossackTexts.physicalLead}</p>
      </div>
      {customFailed && <p className="notice notice--warning">{cossackTexts.customFailed}</p>}
      <ul className="k-physical__list" role="list">
        {exercises.map(({ id, name }) => {
          const totals = record.exercises[id];

          return (
            <li key={id} className="k-physical__item">
              <h3 className="k-physical__exercise">{name}</h3>
              <dl className="k-physical__stats">
                <div className="k-physical__stat">
                  <dt className="k-physical__label">{cossackTexts.physicalBest}</dt>
                  <dd className="k-physical__value">{totals === undefined ? <None /> : formatCount(totals.best)}</dd>
                </div>
                <div className="k-physical__stat">
                  <dt className="k-physical__label">{cossackTexts.physicalTotal}</dt>
                  <dd className="k-physical__value">{formatCount(totals?.total ?? 0)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
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
