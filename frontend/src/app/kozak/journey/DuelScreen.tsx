import { useId } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ExerciseRef } from '../../../domain/catalog/exercise';
import { createSession } from '../../../domain/engine/session';
import { enterBattle } from '../../../domain/kozak/battle';
import { duelConfig, KING_HEALTH, type DuelProgress, type RoundProgress } from '../../../domain/kozak/duel';
import { SICH } from '../../../domain/kozak/journey';
import { campaignOf } from '../../../domain/kozak/progress';
import {
  counts,
  duelTexts,
  energyStatus,
  formatWait,
  kingStageTexts,
  mapTexts,
  prepTexts,
} from '../../../i18n/kozak';
import { levelText, roundStory } from '../../../i18n/kozak-story';
import { Title } from '../../components/Screen';
import { MemoryWarning } from '../../components/notices';
import { useGame } from '../../game';
import { KingPortrait } from '../art/King';
import { Legend } from '../Legend';
import { kozakPaths } from '../paths';
import { Bar, EnergyMeter, KozakIcon, KozakScreen, StatusBadge, WithCossack } from '../parts';
import { useCossack, useNow, type Cossack } from '../record';
import { journeyBattleName } from './common';

// §24.9: the duel with the King of robbers, the final battle of the journey.
export function DuelScreen() {
  return (
    <KozakScreen title={duelTexts.title} className="k-duel-screen">
      <WithCossack>{(cossack) => <Duel cossack={cossack} />}</WithCossack>
    </KozakScreen>
  );
}

function Duel({ cossack }: { cossack: Cossack }) {
  const progress = campaignOf(cossack.progress, 'final-battle');
  const duel = progress?.duel ?? null;
  const head = (
    <header className="k-maphead">
      <Link className="k-back" to={kozakPaths.journey}>
        <KozakIcon name="back" className="k-back__icon" />
        {mapTexts.toJourney}
      </Link>
      <div className="k-maphead__text">
        <p className="k-eyebrow k-eyebrow--gold">{duelTexts.eyebrow}</p>
        <div className="k-maphead__titles">
          <Title className="k-title">{duelTexts.title}</Title>
          <p className="k-maphead__story">{duelTexts.story}</p>
        </div>
      </div>
    </header>
  );

  if (progress === null || duel === null || progress.status === 'locked') {
    return (
      <>
        {head}
        <div className="k-card k-card--locked">
          <h2 className="k-card__title">{duelTexts.lockedTitle}</h2>
          <p className="k-card__text">{duelTexts.lockedText}</p>
          <Link className="k-button k-button--secondary" to={kozakPaths.journey}>
            {mapTexts.toJourney}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className="k-duel">
        <King duel={duel} />
        {/* On a phone the next battle comes right after the King; on a wide screen it stands beside. */}
        {duel.current !== null ? <NextBattle round={duel.current} cossack={cossack} /> : <Legend at={cossack.record.duelAt} />}
        <Rounds duel={duel} />
      </div>
    </>
  );
}

function King({ duel }: { duel: DuelProgress }) {
  const { name, text } = kingStageTexts[duel.stage];

  return (
    <section className="k-card k-duel__king" aria-label={duelTexts.health}>
      <KingPortrait stage={duel.stage} label={duelTexts.portrait(name)} className="k-duel__portrait" />
      <div className="k-duel__state">
        <p className="k-eyebrow k-eyebrow--ember">{name}</p>
        <p className="k-duel__stage-text">{text}</p>
        <p className="k-duel__health">
          <span>{duelTexts.health}</span>
          <b>
            {duel.health} <span>/ {KING_HEALTH}</span>
          </b>
        </p>
        <Bar value={duel.health} max={KING_HEALTH} label={duelTexts.healthLabel(duel.health, KING_HEALTH)} />
        {duel.health > 0 && <p className="k-duel__rules">{duelTexts.rules}</p>}
      </div>
    </section>
  );
}

function Rounds({ duel }: { duel: DuelProgress }) {
  const exerciseName = useExerciseName();

  return (
    <section className="k-card k-duel__rounds" aria-label={duelTexts.rounds}>
      <h2 className="k-card__title">{duelTexts.rounds}</h2>
      <ol className="k-duel__list" role="list">
        {duel.rounds.map(({ round, damage, status }) => (
          <li key={round.id} className={`k-duel__round k-duel__round--${status}`}>
            <span className="k-duel__round-number">{duelTexts.round(round.number)}</span>
            <span className="k-duel__round-name">{levelText(round.id).name}</span>
            <span className="k-duel__round-sets">
              {round.exercises.map(({ exercise, sets }) => `${exerciseName(exercise)} ${sets.join('-')}`).join(' · ')}
            </span>
            <span className="k-duel__round-damage">
              {duelTexts.damage} {duelTexts.damageOf(damage, 20)}
            </span>
            <StatusBadge status={status} />
          </li>
        ))}
      </ol>
    </section>
  );
}

// The round in progress: the sets it has left and the way to its next battle.
function NextBattle({ round, cossack }: { round: RoundProgress; cossack: Cossack }) {
  const { storage, deps, exercises } = useGame();
  const { current } = useCossack();
  const navigate = useNavigate();
  const now = useNow();
  const setsId = useId();
  const exerciseName = useExerciseName();
  const energy = cossack.energy('campaign', now);
  const battle = storage.gameSessions.campaign.load();
  const { name } = levelText(round.round.id);
  const started = round.done.length > 0;

  // §24.4: the battle takes its energy at the start, and the session keeps it.
  const start = () => {
    const config = duelConfig(round, exercises);
    const session = config === null ? null : enterBattle(createSession(config, deps), 'campaign', cossack.fullAt('campaign'));

    if (session !== null) {
      storage.gameSessions.campaign.save(session);
      void navigate(kozakPaths.battle);
    }
  };

  return (
    <section className="k-card k-duel__next" aria-label={duelTexts.current}>
      <p className="k-eyebrow k-eyebrow--gold">
        {duelTexts.current} · {duelTexts.round(round.round.number)}
      </p>
      <h2 className="k-duel__next-name">{name}</h2>
      <p className="k-duel__next-story">{roundStory(round.round.id)}</p>
      <MemoryWarning />
      <p className="k-duel__next-damage">
        {duelTexts.damage} {duelTexts.damageOf(round.damage, 20)}
      </p>
      <h3 id={setsId} className="k-duel__sets-title">
        {duelTexts.sets}
      </h3>
      <ol className="k-duel__sets" role="list" aria-labelledby={setsId}>
        {round.sets.map(({ position, exercise, reps }) => {
          const done = round.done.includes(position);

          return (
            <li key={position} className={done ? 'k-duel__set k-duel__set--done' : 'k-duel__set'}>
              <span>{exerciseName(exercise)}</span>
              <b>{reps}</b>
              <span>{done ? duelTexts.setDone : prepTexts.repsShort}</span>
            </li>
          );
        })}
      </ol>
      <p className="k-duel__glory">{duelTexts.glory(SICH.rewards.round)}</p>
      <EnergyMeter pool="campaign" energy={energy} now={now} compact />
      {battle !== null ? (
        <div className="k-refusal">
          {battle.mode !== 'duel' && (
            <p className="k-refusal__text">
              <b>{prepTexts.busyTitle}.</b> {duelTexts.busy(journeyBattleName(battle))}
            </p>
          )}
          <Link className="k-button k-button--primary k-button--large" to={kozakPaths.battle}>
            {prepTexts.resume}
          </Link>
        </div>
      ) : energy.value === 0 ? (
        <div className="k-refusal">
          <button type="button" className="k-button k-button--locked k-button--large" disabled>
            <KozakIcon name="lock" className="k-button__icon" />
            {started ? duelTexts.goOn : duelTexts.start}
          </button>
          <p className="k-refusal__text">
            {energyStatus.empty(formatWait(Date.parse(energy.nextAt ?? now.toISOString()) - now.getTime()))}
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="k-button k-button--boss k-button--large"
          // The record of this screen knows the battle that has just ended, so its energy counts.
          disabled={!current}
          onClick={start}
        >
          {started ? duelTexts.goOn : duelTexts.start} · {counts.sets(round.sets.length - round.done.length)}
        </button>
      )}
    </section>
  );
}

// The ready-made exercises by their names in the catalog of the site (§5.1).
function useExerciseName(): (id: string) => string {
  const { exercises } = useGame();

  return (id: string) => exercises.find((exercise: ExerciseRef) => exercise.id === id)?.name ?? id;
}
