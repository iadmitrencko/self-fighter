import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { campaignOf, type CampaignProgress } from '../../../domain/kozak/progress';
import { campaignTexts, journeyTexts, mapTexts, stageText } from '../../../i18n/kozak';
import { Title } from '../../components/Screen';
import { CampaignMap, pinStyle, TALL, WIDE, type MapLayout } from '../art/CampaignMap';
import { kozakPaths } from '../paths';
import { Bar, KozakIcon, KozakScreen, WithCossack } from '../parts';
import { KozakNotFound, useJourneyPlace } from './common';
import { MarkerLink, MarkerStill, Pin } from './markers';

// Screen 2 of kozak_design: the map of the ten stages of a campaign.
export function CampaignScreen() {
  const { campaign } = useJourneyPlace();

  if (campaign === null) {
    return <KozakNotFound />;
  }

  return (
    <KozakScreen title={campaignTexts[campaign.id].name} className="k-campaign-screen">
      <WithCossack>
        {({ progress }) => <CampaignView progress={campaignOf(progress, campaign.id) as CampaignProgress} />}
      </WithCossack>
    </KozakScreen>
  );
}

function CampaignView({ progress }: { progress: CampaignProgress }) {
  const { campaign, status, stages, passed } = progress;
  const texts = campaignTexts[campaign.id];
  const tall = useRef<HTMLDivElement>(null);
  const currentIndex = stages.findIndex((stage) => stage.status === 'current');
  const reached = currentIndex === -1 ? stages.length : currentIndex;
  const next = stages[currentIndex] ?? null;

  // §5 of the spec: on a phone the map opens scrolled to the current point.
  useLayoutEffect(() => {
    const box = tall.current;
    const point = TALL.points[Math.min(reached, TALL.points.length - 1)];

    if (box !== null && point !== undefined) {
      box.scrollTop = (point[1] / TALL.height) * box.scrollHeight - box.clientHeight / 2;
    }
  }, [reached]);

  const head = (
    <header className="k-maphead">
      <Link className="k-back" to={kozakPaths.journey}>
        <KozakIcon name="back" className="k-back__icon" />
        {mapTexts.toJourney}
      </Link>
      <div className="k-maphead__text">
        <p className="k-eyebrow k-eyebrow--gold">{mapTexts.campaign(journeyTexts.title)}</p>
        <div className="k-maphead__titles">
          <Title className="k-title">{texts.name}</Title>
          <p className="k-maphead__story">{texts.story}</p>
        </div>
      </div>
      {stages.length > 0 && (
        <div className="k-maphead__progress">
          <p className="k-maphead__count">
            <span>{mapTexts.passedStages}</span>
            <b>
              {passed} <span>{mapTexts.stagesOf(stages.length)}</span>
            </b>
          </p>
          <Bar value={passed} max={stages.length} label={journeyTexts.stagesOf(passed, stages.length)} thin />
        </div>
      )}
    </header>
  );

  if (status === 'locked') {
    return (
      <>
        {head}
        <div className="k-card k-card--locked">
          <h2 className="k-card__title">{mapTexts.locked}</h2>
          <p className="k-card__text">{mapTexts.lockedText}</p>
          <Link className="k-button k-button--secondary" to={kozakPaths.journey}>
            {mapTexts.toJourney}
          </Link>
        </div>
      </>
    );
  }

  const pins = (layout: MapLayout) =>
    stages.map(({ stage, status: stageStatus }, index) => {
      const name = stageText(campaign.id, stage.number).name;
      const final = index === stages.length - 1;
      const look = { status: stageStatus, number: stage.number, boss: final, lockedFace: 'number' as const };
      const label = mapTexts.stageMarker(stage.number, name, stageStatus);
      const current = stageStatus === 'current';
      const wide = layout === WIDE;

      return (
        <Pin
          key={stage.number}
          style={pinStyle(layout, index)}
          side={(current ? layout.currentLabels[index] : layout.labels[index]) ?? 'below'}
          tagTone={current ? 'current' : stageStatus === 'locked' ? (final ? 'boss' : 'locked') : 'plain'}
          tag={current && wide ? mapTexts.youAreHere(name) : wide && !final ? `${stage.number} · ${name}` : name}
        >
          {stageStatus === 'locked' ? (
            <MarkerStill look={look} label={label} />
          ) : (
            <MarkerLink look={look} label={label} to={kozakPaths.stage(campaign.id, stage.number)} />
          )}
        </Pin>
      );
    });

  return (
    <>
      {head}
      <div className="k-campaign-screen__wide">
        <CampaignMap campaign={campaign.id} layout={WIDE} current={reached} label={texts.story}>
          {pins(WIDE)}
          <ul className="k-legend" aria-label={mapTexts.legend}>
            <li className="k-legend__item k-legend__item--done">{mapTexts.legendItems.done}</li>
            <li className="k-legend__item k-legend__item--current">{mapTexts.legendItems.current}</li>
            <li className="k-legend__item k-legend__item--locked">{mapTexts.legendItems.locked}</li>
          </ul>
        </CampaignMap>
        {/* Beside the map where it has no points; under a map narrower than the mockup. */}
        {next !== null && (
          <aside className="k-next" aria-label={mapTexts.next(next.stage.number, stages.length)}>
            <p className="k-eyebrow k-eyebrow--gold k-next__eyebrow">{mapTexts.next(next.stage.number, stages.length)}</p>
            <h2 className="k-next__name">{stageText(campaign.id, next.stage.number).name}</h2>
            <p className="k-next__levels">
              <span>{mapTexts.levelsLabel}</span>
              <b>
                {next.passed} / {next.levels.length}
              </b>
            </p>
            <Link className="k-button k-button--primary k-next__open" to={kozakPaths.stage(campaign.id, next.stage.number)}>
              {mapTexts.open}
            </Link>
          </aside>
        )}
        {next === null && (
          <aside className="k-next k-next--done">
            <p className="k-eyebrow k-eyebrow--gold">{mapTexts.campaignDone}</p>
            <p className="k-next__text">{texts.finale}</p>
          </aside>
        )}
      </div>
      <div className="k-campaign-screen__tall" ref={tall}>
        <CampaignMap campaign={campaign.id} layout={TALL} current={reached} label={texts.story}>
          {pins(TALL)}
        </CampaignMap>
      </div>
      {next !== null && (
        <div className="k-nextbar">
          <div className="k-nextbar__text">
            <p className="k-eyebrow k-eyebrow--gold">{mapTexts.stageOf(next.stage.number, stages.length)}</p>
            <p className="k-nextbar__name">{stageText(campaign.id, next.stage.number).name}</p>
            <p className="k-nextbar__levels">{mapTexts.levelsOf(next.passed, next.levels.length)}</p>
          </div>
          <Link className="k-button k-button--primary" to={kozakPaths.stage(campaign.id, next.stage.number)}>
            {mapTexts.open}
          </Link>
        </div>
      )}
    </>
  );
}
