import { useCallback, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ExerciseRef } from '../../../domain/catalog/exercise';
import {
  addExercise,
  gridTotals,
  removeExercise,
  renameExercise,
  restoreGrid,
  toConfig,
  type FightGrid as Grid,
} from '../../../domain/config/grid';
import type { FightConfig } from '../../../domain/config/types';
import type { FightSession } from '../../../domain/engine/session';
import { energyStatus, fightHallTexts, formatWait } from '../../../i18n/kozak';
import type { CustomExercise } from '../../../storage/contract';
import type { StorageErrorCode } from '../../../storage/errors';
import { Title } from '../../components/Screen';
import { Loading, MemoryWarning } from '../../components/notices';
import { useGame } from '../../game';
import { useLoad } from '../../useLoad';
import { kozakPaths } from '../paths';
import { EnergyMeter, KozakIcon, KozakScreen, WithCossack } from '../parts';
import { useNow, type Cossack } from '../record';
import { AddExerciseDialog } from './AddExerciseDialog';
import { useFightStart, type FightRefusal } from './FightArena';
import { FightGrid } from './FightGrid';

/**
 * §6, resesign/Main.dc.html: the player puts a fight together from exercises and rounds and starts
 * it. The last fight comes back, so the next one starts from it.
 */
export function FightHall() {
  const { storage } = useGame();
  const listCustom = useCallback(() => storage.exercises.list(), [storage]);
  const [custom, reloadCustom] = useLoad(listCustom);
  // Without the last fight the hall starts from the ready-made exercises.
  const loadSaved = useCallback(() => storage.settings.get('fight').catch(() => null), [storage]);
  const [saved] = useLoad(loadSaved);

  return (
    <KozakScreen title={fightHallTexts.title} className="k-hall">
      {saved.status !== 'ready' || custom.status === 'loading' ? (
        <>
          <HallHead />
          <Loading />
        </>
      ) : (
        <Hall
          saved={saved.value}
          custom={custom.status === 'ready' ? custom.value : []}
          customError={custom.status === 'failed' ? custom.error : null}
          onCustomChanged={reloadCustom}
        />
      )}
    </KozakScreen>
  );
}

function HallHead() {
  return (
    <header className="k-head">
      <p className="k-eyebrow">{fightHallTexts.eyebrow}</p>
      <Title className="k-title k-title--display">{fightHallTexts.title}</Title>
      <p className="k-lead">{fightHallTexts.lead}</p>
    </header>
  );
}

function Hall({
  saved,
  custom,
  customError,
  onCustomChanged,
}: {
  saved: FightConfig | null;
  custom: readonly CustomExercise[];
  customError: StorageErrorCode | null;
  onCustomChanged: () => void;
}) {
  const { storage, analytics, exercises: readyMade } = useGame();
  const fights = useFightStart();
  const navigate = useNavigate();
  const catalog: readonly ExerciseRef[] = [...readyMade, ...custom];
  const [grid, setGrid] = useState(() => restoreGrid(saved, catalog, readyMade));
  const [refusal, setRefusal] = useState<FightRefusal | null>(null);
  const [adding, setAdding] = useState(false);
  const session = storage.gameSessions.fight.load();

  const start = (config: FightConfig) => {
    const refused = fights.start(config);

    if (refused !== null) {
      setRefusal(refused);

      return;
    }
    // The next fight starts from this one. The settings make a new player a guest, so the event
    // that follows them names the user (§19); a failure is not worth stopping a fight for.
    void storage.settings
      .save(config)
      .catch(() => undefined)
      .then(() => analytics.track({ name: 'workout_started', mode: 'fight' }));
    void navigate(kozakPaths.fightBattle);
  };

  return (
    <div className="k-hall__body">
      <div className="k-hall__main">
        <HallHead />
        <MemoryWarning />
        {customError !== null && <p className="notice notice--warning">{fightHallTexts.customFailed}</p>}
        <FightGrid grid={grid} onChange={setGrid} onAdd={() => setAdding(true)} />
        <p className="k-hall__hint">{fightHallTexts.hint}</p>
      </div>
      <div className="k-hall__side">
        {session !== null && <Resume session={session} />}
        <WithCossack>
          {(cossack) => <Summary grid={grid} cossack={cossack} refusal={refusal} onStart={start} />}
        </WithCossack>
      </div>
      {adding && (
        <AddExerciseDialog
          catalog={catalog}
          custom={custom}
          taken={grid.exercises.map(({ id }) => id)}
          onPick={(exercise) => {
            setGrid((current) => addExercise(current, exercise));
            setAdding(false);
          }}
          onRenamed={(exercise) => setGrid((current) => renameExercise(current, exercise))}
          onDeleted={(id) => setGrid((current) => removeExercise(current, id))}
          onCustomChanged={onCustomChanged}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

// A fight in progress waits for the player: the hall offers it back.
function Resume({ session }: { session: FightSession }) {
  const titleId = useId();

  return (
    <section className="k-card k-card--active" aria-labelledby={titleId}>
      <h2 id={titleId} className="k-card__title">
        {fightHallTexts.resumeTitle}
      </h2>
      <p className="k-card__text">
        {fightHallTexts.resumeProgress(session.stages.filter(({ done }) => done !== null).length, session.stages.length)}
      </p>
      <Link className="k-button k-button--primary" to={kozakPaths.fightBattle}>
        {fightHallTexts.resume}
      </Link>
    </section>
  );
}

// The energy of fights, what the fight holds, how it is won and the way into it.
function Summary({
  grid,
  cossack,
  refusal,
  onStart,
}: {
  grid: Grid;
  cossack: Cossack;
  refusal: FightRefusal | null;
  onStart: (config: FightConfig) => void;
}) {
  const now = useNow();
  const titleId = useId();
  const energy = cossack.energy('fight', now);
  const totals = gridTotals(grid);
  const config = toConfig(grid);
  const stats = [
    [grid.exercises.length, fightHallTexts.exercises(grid.exercises.length)],
    [grid.rounds, fightHallTexts.rounds(grid.rounds)],
    [totals.reps, fightHallTexts.repsTotal(totals.reps)],
  ] as const;

  return (
    <>
      <EnergyMeter pool="fight" energy={energy} now={now} />
      <section className="k-card k-summary" aria-labelledby={titleId}>
        <h2 id={titleId} className="k-summary__title">
          {fightHallTexts.summary}
        </h2>
        <ul className="k-summary__stats" role="list">
          {stats.map(([value, label], index) => (
            <li key={label} className={index === 2 ? 'k-summary__stat k-summary__stat--gold' : 'k-summary__stat'}>
              <b>{value}</b> <span>{label}</span>
            </li>
          ))}
        </ul>
        <dl className="k-summary__rules">
          <div className="k-summary__rule k-summary__rule--win">
            <dt>{fightHallTexts.win}</dt>
            <dd>{fightHallTexts.winRule(totals.sets)}</dd>
          </div>
          <div className="k-summary__rule k-summary__rule--loss">
            <dt>{fightHallTexts.loss}</dt>
            <dd>{fightHallTexts.lossRule}</dd>
          </div>
          <div className="k-summary__rule">
            <dt>{fightHallTexts.reward}</dt>
            <dd>{fightHallTexts.rewardRule}</dd>
          </div>
        </dl>
        {energy.value === 0 ? (
          <div className="k-refusal">
            <button type="button" className="k-button k-button--locked k-button--large" disabled>
              <KozakIcon name="lock" className="k-button__icon" />
              {fightHallTexts.noEnergy}
            </button>
            <p className="k-refusal__text">
              {energyStatus.empty(formatWait(Date.parse(energy.nextAt ?? now.toISOString()) - now.getTime()))}
            </p>
          </div>
        ) : (
          <>
            {config === null && <p className="k-summary__empty">{fightHallTexts.empty}</p>}
            {refusal !== null && (
              <p className="notice notice--warning" role="alert">
                {refusal === 'busy' ? fightHallTexts.busy : fightHallTexts.refusal}
              </p>
            )}
            <button
              type="button"
              className="k-button k-button--primary k-button--large k-summary__start"
              disabled={config === null}
              onClick={() => config !== null && onStart(config)}
            >
              {fightHallTexts.start}
              <span className="k-summary__cost">{fightHallTexts.cost}</span>
            </button>
          </>
        )}
      </section>
    </>
  );
}
