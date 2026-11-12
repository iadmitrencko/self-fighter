import { useState } from 'react';
import { Link } from 'react-router';
import { totalReps, type CampaignDefinition } from '../../../domain/kozak/journey';
import { campaignOf, type LevelProgress, type StageProgress } from '../../../domain/kozak/progress';
import { campaignTexts, levelText, levelTypeNames, mapTexts, stageMapTexts, stageText } from '../../../i18n/kozak';
import { Title } from '../../components/Screen';
import { pinVars } from '../art/CampaignMap';
import { BossPortrait } from '../art/Scenes';
import { StageMap, stageLayout } from '../art/StageMap';
import { kozakPaths } from '../paths';
import { Badge, Bar, KozakIcon, KozakScreen, StatusBadge, WithCossack } from '../parts';
import { KozakNotFound, scheme, useCampaignExercise, useJourneyPlace } from './common';
import { MarkerButton, Pin } from './markers';

// Screens 3–4 of kozak_design: the local map of a stage and the card of the chosen level.
export function StageScreen() {
  const { campaign, stage } = useJourneyPlace();

  if (campaign === null || stage === null) {
    return <KozakNotFound />;
  }

  return (
    <KozakScreen title={stageText(campaign.id, stage.number).name} className="k-stage-screen">
      <WithCossack>
        {({ progress }) => {
          const found = campaignOf(progress, campaign.id)?.stages.find((item) => item.stage === stage);

          return found === undefined ? <KozakNotFound /> : <StageView campaign={campaign} progress={found} />;
        }}
      </WithCossack>
    </KozakScreen>
  );
}

function StageView({ campaign, progress }: { campaign: CampaignDefinition; progress: StageProgress }) {
  const { stage, levels, passed } = progress;
  const texts = stageText(campaign.id, stage.number);
  const currentIndex = levels.findIndex(({ status }) => status === 'current');
  const reached = currentIndex === -1 ? (progress.status === 'done' ? levels.length : 0) : currentIndex;
  // The current level is chosen at first; a passed stage shows its boss.
  const [chosen, setChosen] = useState<number | null>(null);
  const selected = chosen ?? Math.min(reached, levels.length - 1);
  const layout = stageLayout(campaign.id, stage.number);
  const card = levels[selected] as LevelProgress;

  return (
    <>
      <header className="k-maphead">
        <Link className="k-back" to={kozakPaths.campaign(campaign.id)}>
          <KozakIcon name="back" className="k-back__icon" />
          {stageMapTexts.toCampaign}
        </Link>
        <div className="k-maphead__text">
          <p className="k-eyebrow k-eyebrow--gold">{stageMapTexts.eyebrow(campaignTexts[campaign.id].name, stage.number)}</p>
          <div className="k-maphead__titles">
            <Title className="k-title">{texts.name}</Title>
            <p className="k-maphead__story">{texts.story}</p>
          </div>
        </div>
        <div className="k-maphead__progress">
          <p className="k-maphead__count">
            <span>{stageMapTexts.levels}</span>
            <b>
              {passed} <span>/ {levels.length}</span>
            </b>
          </p>
          <Bar value={passed} max={levels.length} label={mapTexts.levelsOf(passed, levels.length)} thin />
        </div>
      </header>
      {progress.status === 'locked' && (
        <p className="notice notice--warning" role="status">
          {stageMapTexts.stageLocked}
        </p>
      )}
      <div className="k-stage">
        <div className="k-stage__map">
          <StageMap campaign={campaign.id} stage={stage.number} current={reached} label={texts.story}>
            {levels.map(({ level, status }, index) => {
              const { name, short } = levelText(level.id);
              const isSelected = index === selected;

              return (
                <Pin
                  key={level.id}
                  style={pinVars(layout, index)}
                  side={layout.labels[index] ?? 'below'}
                  tagTone={isSelected ? 'selected' : status === 'locked' ? 'locked' : level.boss ? 'boss' : 'plain'}
                  tag={
                    <>
                      <span className="k-tag__full">{level.boss ? stageMapTexts.bossLabel(name) : `${level.number} · ${name}`}</span>
                      <span className="k-tag__short">{short}</span>
                    </>
                  }
                >
                  <MarkerButton
                    look={{ status, number: level.number, boss: level.boss, lockedFace: 'lock' }}
                    selected={isSelected}
                    label={stageMapTexts.marker(level.number, name, status, level.boss)}
                    onSelect={() => setChosen(index)}
                  />
                </Pin>
              );
            })}
          </StageMap>
        </div>
        <aside className="k-stage__panel" aria-label={stageMapTexts.selected}>
          <p className="k-eyebrow k-stage__panel-label">{stageMapTexts.selected}</p>
          <LevelCard campaign={campaign} progress={card} previous={levels[selected - 1] ?? null} />
          <p className="k-stage__hint">{stageMapTexts.hint}</p>
        </aside>
      </div>
    </>
  );
}

function LevelCard({
  campaign,
  progress,
  previous,
}: {
  campaign: CampaignDefinition;
  progress: LevelProgress;
  previous: LevelProgress | null;
}) {
  const { level, status } = progress;
  const exercise = useCampaignExercise(campaign);
  const { name, story } = levelText(level.id);

  return (
    <section className={level.boss ? 'k-level k-level--boss' : 'k-level'} aria-live="polite">
      {level.boss && <BossPortrait label={stageMapTexts.portrait(name)} className="k-level__portrait" />}
      <p className={level.boss ? 'k-eyebrow k-eyebrow--ember' : 'k-eyebrow k-eyebrow--gold'}>
        {level.boss ? stageMapTexts.bossEyebrow(level.number) : stageMapTexts.levelEyebrow(level.number, levelTypeNames[level.type])}
      </p>
      <h2 className="k-level__name">{name}</h2>
      <p className="k-level__story">{story}</p>
      <dl className="k-tiles">
        <div className="k-tile">
          <dt>{stageMapTexts.exercise}</dt>
          <dd>{exercise.name}</dd>
        </div>
        <div className="k-tile">
          <dt>{stageMapTexts.scheme}</dt>
          <dd>{scheme(level.sets)}</dd>
        </div>
        <div className="k-tile">
          <dt>{stageMapTexts.total}</dt>
          <dd>{totalReps(level)}</dd>
        </div>
      </dl>
      <p className="k-level__status">
        <span>{stageMapTexts.status}</span>
        {level.boss && status !== 'done' && <Badge tone="boss">{stageMapTexts.bossBadge}</Badge>}
        <StatusBadge status={status} />
      </p>
      {status === 'current' && (
        <Link
          className={level.boss ? 'k-button k-button--boss k-button--large' : 'k-button k-button--primary k-button--large'}
          to={kozakPaths.level(level.id)}
        >
          {level.boss ? stageMapTexts.challenge : stageMapTexts.go}
        </Link>
      )}
      {status === 'locked' && (
        <div className="k-level__locked">
          <button type="button" className="k-button k-button--locked k-button--large" disabled>
            <KozakIcon name="lock" className="k-button__icon" />
            {stageMapTexts.closed}
          </button>
          {previous !== null && <p className="k-level__hint">{stageMapTexts.opensAfter(levelText(previous.level.id).name)}</p>}
        </div>
      )}
    </section>
  );
}
