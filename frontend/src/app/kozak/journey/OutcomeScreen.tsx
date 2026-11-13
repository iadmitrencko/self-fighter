import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import type { CampaignAttempt } from '../../../domain/history/attempt';
import { findLevel, SICH, totalReps, type LevelDefinition } from '../../../domain/kozak/journey';
import { campaignOf, levelProgress } from '../../../domain/kozak/progress';
import { standingOf } from '../../../domain/kozak/ranks';
import { awardFor } from '../../../domain/kozak/glory';
import {
  campaignTexts,
  defeatTexts,
  rankNames,
  resultTexts,
  victoryTexts,
} from '../../../i18n/kozak';
import { levelText, stageText } from '../../../i18n/kozak-story';
import type { AttemptStatus } from '../../../storage/contract';
import { Title } from '../../components/Screen';
import { ErrorNotice } from '../../components/notices';
import { useGame } from '../../game';
import { useLoad } from '../../useLoad';
import { BossVictoryScene, DefeatScene, VictoryScene } from '../art/Scenes';
import { kozakPaths } from '../paths';
import { KozakScreen, WithCossack } from '../parts';
import { useCossack, useFresh, type Cossack } from '../record';
import { KozakNotFound, Pending } from './common';
import { DuelOutcome } from './DuelOutcome';

// Screens 7–8 of kozak_design and the retreat: how a level of the journey ended.
export function OutcomeScreen() {
  const { id = '' } = useParams();
  const { storage } = useGame();
  // A battle that has just ended is on its way to the server: its status shows after that try.
  const load = useCallback(async () => {
    await storage.attempts.flush();

    return storage.attempts.get(id);
  }, [storage, id]);
  const [stored, reload] = useLoad(load);

  if (stored.status === 'loading') {
    return <WithCossack>{() => null}</WithCossack>;
  }
  if (stored.status === 'failed') {
    return (
      <KozakScreen title={resultTexts.notFound}>
        <ErrorNotice error={stored.error} onRetry={reload} />
      </KozakScreen>
    );
  }
  const attempt = stored.value?.attempt;

  // §24.9: a battle of the duel with the King tells the damage it did.
  if (attempt?.mode === 'duel' && stored.value !== null) {
    const { status } = stored.value;

    return <WithCossack>{(cossack) => <DuelOutcome attempt={attempt} cossack={cossack} status={status} />}</WithCossack>;
  }
  const level = attempt?.mode === 'campaign' ? findLevel(SICH, attempt.config.level) : null;

  if (attempt?.mode !== 'campaign' || level === null || stored.value === null) {
    return <KozakNotFound />;
  }

  return (
    <WithCossack>
      {(cossack) =>
        attempt.result.outcome === 'win' ? (
          <Victory attempt={attempt} level={level} cossack={cossack} status={stored.value?.status ?? 'saved'} />
        ) : (
          <Defeat attempt={attempt} level={level} status={stored.value?.status ?? 'saved'} />
        )
      }
    </WithCossack>
  );
}

function Victory({
  attempt,
  level,
  cossack,
  status,
}: {
  attempt: CampaignAttempt;
  level: LevelDefinition;
  cossack: Cossack;
  status: AttemptStatus;
}) {
  const { current } = useCossack();
  const fresh = useFresh();
  const award = awardFor(SICH, cossack.record.passed, level.id);
  const campaign = campaignOf(cossack.progress, level.campaign);
  const stage = campaign?.stages[level.stage - 1];
  const nextInStage = stage?.levels[level.number] ?? null;
  const nextStage = campaign?.stages[level.stage] ?? null;
  const name = levelText(level.id);
  const reps = totalReps(attempt.config);
  // A new rank is told right after the battle, when the record already counts it.
  const promoted =
    fresh && current && standingOf(cossack.glory - award.total).rank.id !== cossack.standing.rank.id
      ? rankNames[cossack.standing.rank.id]
      : null;
  const stageName = stageText(level.campaign, level.stage).name;
  const tiles = (
    <dl className="k-tiles k-tiles--result">
      <div className="k-tile">
        <dt>{victoryTexts.exercise}</dt>
        <dd>{attempt.config.exercise.name}</dd>
      </div>
      <div className="k-tile">
        <dt>{victoryTexts.reps}</dt>
        <dd className="k-tile__big">
          {reps} / {reps}
        </dd>
      </div>
      <div className="k-tile k-tile--glory">
        <dt>{victoryTexts.glory}</dt>
        <dd className="k-tile__big">+{award.total}</dd>
      </div>
    </dl>
  );
  const notes = (
    <>
      {award.campaign > 0 && <p className="k-outcome__bonus">{victoryTexts.campaignBonus(award.campaign)}</p>}
      {award.journey > 0 && <p className="k-outcome__bonus">{victoryTexts.journeyBonus(award.journey)}</p>}
      {promoted !== null && (
        <p className="k-outcome__rank" role="status">
          {victoryTexts.newRank}: <b>{promoted}</b>
        </p>
      )}
      <Pending status={status} />
    </>
  );

  if (!level.boss) {
    return (
      <KozakScreen title={victoryTexts.title} className="k-outcome">
        <div className="k-outcome__scene">
          <VictoryScene label={victoryTexts.scene} />
          <p className="k-outcome__badge">{victoryTexts.badge}</p>
        </div>
        <div className="k-outcome__body">
          <Title className="k-title k-outcome__title">{victoryTexts.title}</Title>
          <p className="k-outcome__sub">{victoryTexts.passed(level.number, name.name)}</p>
          {tiles}
          {notes}
          {nextInStage !== null && (
            <p className="k-unlocked">
              <span className="k-unlocked__marker" aria-hidden="true">
                {nextInStage.level.number}
              </span>
              <span className="k-unlocked__text">
                <span className="k-eyebrow k-eyebrow--pine">{victoryTexts.nextLevel}</span>
                <b>{levelText(nextInStage.level.id).name}</b>
              </span>
            </p>
          )}
          <div className="k-actions k-actions--stack">
            <Link
              className="k-button k-button--primary k-button--large"
              to={nextInStage !== null ? kozakPaths.level(nextInStage.level.id) : kozakPaths.stage(level.campaign, level.stage)}
            >
              {victoryTexts.next}
            </Link>
            <Link className="k-button k-button--text" to={kozakPaths.stage(level.campaign, level.stage)}>
              {victoryTexts.toStage}
            </Link>
          </div>
        </div>
      </KozakScreen>
    );
  }

  const campaignDone = campaign?.status === 'done';
  const accusative = name.defeated ?? name.name;

  return (
    <KozakScreen title={victoryTexts.bossTitle(accusative)} className="k-outcome k-outcome--boss">
      <BossVictoryScene label={victoryTexts.bossScene} />
      <div className="k-outcome__boss">
        <p className="k-outcome__badge k-outcome__badge--boss">{victoryTexts.bossBadge}</p>
        <div className="k-outcome__body">
          <Title className="k-title k-outcome__title">{victoryTexts.bossTitle(accusative)}</Title>
          <p className="k-outcome__sub">{stageText(level.campaign, level.stage).outcome}</p>
          {tiles}
          {notes}
          <div className="k-stagedone">
            <p className="k-stagedone__head">
              <span>{victoryTexts.stagePassed(stageName)}</span>
              <b>
                {stage?.passed ?? 0} / {stage?.levels.length ?? 0}
              </b>
            </p>
            <div className="k-stagedone__segments" aria-hidden="true">
              {stage?.levels.map(({ level: item }) => (
                <span key={item.id} className={item.boss ? 'k-stagedone__segment k-stagedone__segment--boss' : 'k-stagedone__segment'} />
              ))}
            </div>
            {campaignDone ? (
              <p className="k-stagedone__next">
                <span className="k-eyebrow k-eyebrow--pine">{victoryTexts.campaignPassed(campaignTexts[level.campaign].name)}</span>
              </p>
            ) : (
              nextStage !== null && (
                <p className="k-stagedone__next">
                  <span className="k-eyebrow k-eyebrow--pine">{victoryTexts.nextStage(nextStage.stage.number)}</span>
                  <b>{stageText(level.campaign, nextStage.stage.number).name}</b>
                </p>
              )
            )}
          </div>
          <div className="k-actions k-actions--stack">
            <Link
              className="k-button k-button--primary k-button--large"
              to={campaignDone ? kozakPaths.journey : kozakPaths.campaign(level.campaign)}
            >
              {campaignDone ? victoryTexts.toJourney : victoryTexts.toCampaign}
            </Link>
            <Link className="k-button k-button--text" to={kozakPaths.stage(level.campaign, level.stage)}>
              {victoryTexts.toStage}
            </Link>
          </div>
        </div>
      </div>
    </KozakScreen>
  );
}

function Defeat({ attempt, level, status }: { attempt: CampaignAttempt; level: LevelDefinition; status: AttemptStatus }) {
  const { cossack } = useCossack();
  const { sets } = attempt.result;
  // The level may already be passed by another battle, so a new try is offered only while it waits.
  const open = cossack.status === 'ready' && levelProgress(cossack.value.progress, level.id)?.status === 'current';

  return (
    <KozakScreen title={defeatTexts.title} className="k-outcome k-outcome--defeat">
      <div className="k-outcome__scene">
        <DefeatScene label={defeatTexts.scene} />
        <p className="k-outcome__badge k-outcome__badge--muted">{defeatTexts.badge}</p>
      </div>
      <div className="k-outcome__body">
        <Title className="k-title k-outcome__title">{defeatTexts.title}</Title>
        <p className="k-outcome__sub">{defeatTexts.text}</p>
        <dl className="k-tiles k-tiles--result">
          <div className="k-tile">
            <dt>{victoryTexts.exercise}</dt>
            <dd>{attempt.config.exercise.name}</dd>
          </div>
          <div className="k-tile">
            <dt>{defeatTexts.sets}</dt>
            <dd className="k-tile__big">{defeatTexts.setsOf(sets.filter(({ done }) => done).length, sets.length)}</dd>
          </div>
          <div className="k-tile">
            <dt>{victoryTexts.glory}</dt>
            <dd className="k-tile__big">0</dd>
          </div>
        </dl>
        <Pending status={status} />
        <div className="k-actions k-actions--stack">
          {open && (
            <Link className="k-button k-button--primary k-button--large" to={kozakPaths.level(level.id)}>
              {defeatTexts.retry}
            </Link>
          )}
          <Link className="k-button k-button--text" to={kozakPaths.stage(level.campaign, level.stage)}>
            {defeatTexts.toStage}
          </Link>
        </div>
      </div>
    </KozakScreen>
  );
}
