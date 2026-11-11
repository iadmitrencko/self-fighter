import { useId } from 'react';
import { Link, useNavigate } from 'react-router';
import { createSession } from '../../../domain/engine/session';
import { enterBattle, levelConfig } from '../../../domain/kozak/battle';
import { SICH, totalReps, type CampaignDefinition, type LevelDefinition } from '../../../domain/kozak/journey';
import { levelProgress } from '../../../domain/kozak/progress';
import { awardFor } from '../../../domain/kozak/glory';
import {
  campaignTexts,
  counts,
  energyStatus,
  formatWait,
  levelText,
  levelTypeNames,
  prepTexts,
  stageMapTexts,
  stageText,
} from '../../../i18n/kozak';
import { Title } from '../../components/Screen';
import { MemoryWarning } from '../../components/notices';
import { useGame } from '../../game';
import { BossPortrait, PrepScene } from '../art/Scenes';
import { kozakPaths } from '../paths';
import { EnergyMeter, KozakIcon, KozakScreen, WithCossack } from '../parts';
import { useCossack, useNow, type Cossack } from '../record';
import { KozakNotFound, scheme, useCampaignExercise, useJourneyPlace } from './common';

// Screen 5 of kozak_design: the task of a level before the battle.
export function PrepScreen() {
  const { campaign, level } = useJourneyPlace();

  if (campaign === null || level === null) {
    return <KozakNotFound />;
  }

  return (
    <KozakScreen title={levelText(level.id).name} className="k-prep">
      <WithCossack>{(cossack) => <Prep campaign={campaign} level={level} cossack={cossack} />}</WithCossack>
    </KozakScreen>
  );
}

function Prep({ campaign, level, cossack }: { campaign: CampaignDefinition; level: LevelDefinition; cossack: Cossack }) {
  const { storage, deps } = useGame();
  const { current } = useCossack();
  const navigate = useNavigate();
  const now = useNow();
  const exercise = useCampaignExercise(campaign);
  const taskId = useId();
  const { name, story } = levelText(level.id);
  const status = levelProgress(cossack.progress, level.id)?.status ?? 'locked';
  const energy = cossack.energy('campaign', now);
  const award = awardFor(SICH, cossack.record.passed, level.id);
  const battle = storage.gameSessions.campaign.load();
  const reps = totalReps(level);

  // §24.4: the battle takes its energy at the start, and the session keeps it.
  const start = () => {
    const session = enterBattle(createSession(levelConfig(level, exercise), deps), 'campaign', cossack.fullAt('campaign'));

    if (session !== null) {
      storage.gameSessions.campaign.save(session);
      void navigate(kozakPaths.battle);
    }
  };

  return (
    <div className="k-prep__layout">
      <div className="k-prep__scene">
        {level.boss ? (
          <BossPortrait label={prepTexts.bossScene(name)} className="k-prep__art" />
        ) : (
          <PrepScene label={prepTexts.scene} />
        )}
        <Link className="k-prep__back" to={kozakPaths.stage(campaign.id, level.stage)} aria-label={prepTexts.back}>
          <KozakIcon name="back" className="k-prep__back-icon" />
        </Link>
        <p className="k-prep__crumbs">
          {prepTexts.crumbs(campaignTexts[campaign.id].name, stageText(campaign.id, level.stage).name)}
        </p>
      </div>
      <div className="k-prep__content">
        <p className={level.boss ? 'k-eyebrow k-eyebrow--ember' : 'k-eyebrow k-eyebrow--gold'}>
          {level.boss ? stageMapTexts.bossEyebrow(level.number) : stageMapTexts.levelEyebrow(level.number, levelTypeNames[level.type])}
        </p>
        <Title className="k-title">{name}</Title>
        <p className="k-lead">{story}</p>
        <MemoryWarning />
        <section className="k-task" aria-labelledby={taskId}>
          <div className="k-task__head">
            <p className="k-task__fact">
              <span id={taskId}>{prepTexts.task}</span>
              <b>{exercise.name}</b>
            </p>
            <p className="k-task__fact k-task__fact--total">
              <span>{prepTexts.total}</span>
              <b>{counts.reps(reps)}</b>
            </p>
          </div>
          <ol className="k-task__sets" role="list">
            {level.sets.map((set, index) => (
              <li key={index} className="k-task__set">
                <span>{prepTexts.set(index + 1)}</span>
                <b>{set}</b>
                <span>{prepTexts.repsShort}</span>
              </li>
            ))}
          </ol>
          <p className="k-task__foot">
            <span>{prepTexts.scheme(scheme(level.sets), level.sets.length)}</span>
            <span>{prepTexts.rest}</span>
          </p>
        </section>
        {status !== 'done' && <p className="k-prep__glory">{prepTexts.glory(award.total)}</p>}
        <EnergyMeter pool="campaign" energy={energy} now={now} compact />
      </div>
      <div className="k-prep__action">
        {battle !== null ? (
          <div className="k-refusal">
            {battle.config.level !== level.id && (
              <p className="k-refusal__text">
                <b>{prepTexts.busyTitle}.</b> {prepTexts.busy(levelText(battle.config.level).name)}
              </p>
            )}
            <Link className="k-button k-button--primary k-button--large" to={kozakPaths.battle}>
              {prepTexts.resume}
            </Link>
          </div>
        ) : status === 'done' ? (
          <p className="k-refusal__text k-refusal__text--done">{prepTexts.passed}</p>
        ) : status === 'locked' ? (
          <p className="k-refusal__text">{prepTexts.locked}</p>
        ) : energy.value === 0 ? (
          <div className="k-refusal">
            <button type="button" className="k-button k-button--locked k-button--large" disabled>
              <KozakIcon name="lock" className="k-button__icon" />
              {level.boss ? prepTexts.startBoss : prepTexts.start}
            </button>
            <p className="k-refusal__text">
              {energyStatus.empty(formatWait(Date.parse(energy.nextAt ?? now.toISOString()) - now.getTime()))}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className={level.boss ? 'k-button k-button--boss k-button--large' : 'k-button k-button--primary k-button--large'}
            // The record of this screen knows the battle that has just ended, so its energy counts.
            disabled={!current}
            onClick={start}
          >
            {level.boss ? prepTexts.startBoss : prepTexts.start}
          </button>
        )}
      </div>
    </div>
  );
}
