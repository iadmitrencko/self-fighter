import { Link } from 'react-router';
import type { DuelAttempt } from '../../../domain/history/attempt';
import { addDuelDone, donePlaces, KING_HEALTH, type DuelDone, type DuelProgress } from '../../../domain/kozak/duel';
import { duelAward } from '../../../domain/kozak/glory';
import { SICH } from '../../../domain/kozak/journey';
import { campaignOf, journeyProgress } from '../../../domain/kozak/progress';
import { standingOf } from '../../../domain/kozak/ranks';
import { duelOutcomeTexts, duelTexts, kingStageTexts, rankNames, victoryTexts } from '../../../i18n/kozak';
import { levelText } from '../../../i18n/kozak-story';
import type { AttemptStatus } from '../../../storage/contract';
import { Title } from '../../components/Screen';
import { KingPortrait } from '../art/King';
import { BossVictoryScene } from '../art/Scenes';
import { kozakPaths } from '../paths';
import { Bar, KozakScreen } from '../parts';
import { useCossack, useFresh, type Cossack } from '../record';
import { Pending } from './common';
import { Legend } from '../Legend';

const duelOf = (passed: readonly string[], done: DuelDone): DuelProgress | null =>
  campaignOf(journeyProgress(SICH, passed, done), 'final-battle')?.duel ?? null;

/**
 * §24.9: how a battle of the duel with the King ended: the damage it did, the round it finished,
 * and at last the victory over the King that ends the journey.
 */
export function DuelOutcome({ attempt, cossack, status }: { attempt: DuelAttempt; cossack: Cossack; status: AttemptStatus }) {
  const { current } = useCossack();
  const fresh = useFresh();
  const { round: id } = attempt.config;
  const own = donePlaces(attempt);
  // The record may not count this battle yet; without its sets the duel stood as before it.
  const done = addDuelDone(cossack.record.duel, { [id]: own });
  const without: DuelDone = { ...done, [id]: (done[id] ?? []).filter((place) => !own.includes(place)) };
  const before = duelOf(cossack.record.passed, without);
  const after = duelOf(cossack.record.passed, done);
  const award = duelAward(SICH, cossack.record.passed, without, done);
  const health = after?.health ?? KING_HEALTH;
  const damage = (before?.health ?? KING_HEALTH) - health;
  // Only the battle that took the last of his health ends the duel; the others tell their damage.
  const victory = health === 0 && attempt.result.outcome === 'win' && (before?.health ?? 0) > 0;
  const round = after?.rounds.find((item) => item.round.id === id);
  const roundPassed = round?.status === 'done' && before?.rounds.find((item) => item.round.id === id)?.status !== 'done';
  const name = levelText(id).name;
  const promoted =
    fresh && current && standingOf(cossack.glory - award.total).rank.id !== cossack.standing.rank.id
      ? rankNames[cossack.standing.rank.id]
      : null;
  const { sets } = attempt.result;
  const tiles = (
    <dl className="k-tiles k-tiles--result">
      <div className="k-tile">
        <dt>{duelOutcomeTexts.dealt}</dt>
        <dd className="k-tile__big">−{damage}</dd>
      </div>
      <div className="k-tile">
        <dt>{duelOutcomeTexts.sets}</dt>
        <dd className="k-tile__big">{duelOutcomeTexts.setsOf(sets.filter((set) => set.done).length, sets.length)}</dd>
      </div>
      <div className="k-tile k-tile--glory">
        <dt>{victoryTexts.glory}</dt>
        <dd className="k-tile__big">+{award.total}</dd>
      </div>
    </dl>
  );
  const notes = (
    <>
      {award.journey > 0 && <p className="k-outcome__bonus">{victoryTexts.journeyBonus(award.journey)}</p>}
      {promoted !== null && (
        <p className="k-outcome__rank" role="status">
          {victoryTexts.newRank}: <b>{promoted}</b>
        </p>
      )}
      <Pending status={status} />
    </>
  );

  if (victory) {
    return (
      <KozakScreen title={duelOutcomeTexts.victoryTitle} className="k-outcome k-outcome--boss">
        <BossVictoryScene label={duelOutcomeTexts.victoryScene} />
        <div className="k-outcome__boss">
          <p className="k-outcome__badge k-outcome__badge--boss">{duelOutcomeTexts.victoryBadge}</p>
          <div className="k-outcome__body">
            <Title className="k-title k-outcome__title">{duelOutcomeTexts.victoryTitle}</Title>
            <p className="k-outcome__sub">{duelOutcomeTexts.victoryStory}</p>
            {tiles}
            {notes}
            <Legend at={attempt.finishedAt} />
            <div className="k-actions k-actions--stack">
              <Link className="k-button k-button--primary k-button--large" to={kozakPaths.cossack}>
                {duelTexts.toCossack}
              </Link>
              <Link className="k-button k-button--text" to={kozakPaths.journey}>
                {duelTexts.toJourney}
              </Link>
            </div>
          </div>
        </div>
      </KozakScreen>
    );
  }

  const stage = after?.stage ?? 'unbroken';
  const next = roundPassed ? (after?.current ?? null) : null;

  return (
    <KozakScreen title={duelOutcomeTexts.title(damage)} className="k-outcome k-outcome--duel">
      <div className="k-outcome__scene">
        <KingPortrait stage={stage} label={duelOutcomeTexts.scene(kingStageTexts[stage].name)} className="k-scene" />
        <p className="k-outcome__badge">{duelOutcomeTexts.struck}</p>
      </div>
      <div className="k-outcome__body">
        <Title className="k-title k-outcome__title">{duelOutcomeTexts.title(damage)}</Title>
        <p className="k-outcome__sub">
          {before?.stage !== stage ? duelOutcomeTexts.stage(kingStageTexts[stage].name) : duelOutcomeTexts.held}
        </p>
        <p className="k-duel__health">
          <span>{duelOutcomeTexts.health}</span>
          <b>
            {health} <span>/ {KING_HEALTH}</span>
          </b>
        </p>
        <Bar value={health} max={KING_HEALTH} label={duelTexts.healthLabel(health, KING_HEALTH)} />
        {tiles}
        {notes}
        {roundPassed && (
          <p className="k-unlocked">
            <span className="k-unlocked__text">
              <span className="k-eyebrow k-eyebrow--pine">{duelOutcomeTexts.roundPassed(name)}</span>
              {next !== null && <b>{duelOutcomeTexts.nextRound(next.round.number)}</b>}
            </span>
          </p>
        )}
        <div className="k-actions k-actions--stack">
          <Link className="k-button k-button--primary k-button--large" to={kozakPaths.campaign('final-battle')}>
            {health > 0 ? duelOutcomeTexts.goOn : duelOutcomeTexts.toDuel}
          </Link>
          <Link className="k-button k-button--text" to={kozakPaths.journey}>
            {duelTexts.toJourney}
          </Link>
        </div>
      </div>
    </KozakScreen>
  );
}
