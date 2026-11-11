import { Link } from 'react-router';
import type { CampaignProgress, JourneyProgress } from '../../../domain/kozak/progress';
import { campaignTexts, journeyTexts } from '../../../i18n/kozak';
import { Title } from '../../components/Screen';
import { CampaignArt } from '../art/Scenes';
import { kozakPaths } from '../paths';
import { Badge, Bar, KozakIcon, KozakScreen, WithCossack } from '../parts';

// Screen 1 of kozak_design: the journey «Січ» and the choice of a campaign (§24.5).
export function JourneyScreen() {
  return (
    <KozakScreen title={journeyTexts.title} className="k-journey">
      <header className="k-head k-head--wide">
        <div className="k-head__titles">
          <p className="k-eyebrow k-eyebrow--gold">{journeyTexts.eyebrow}</p>
          <Title className="k-title k-title--display">{journeyTexts.title}</Title>
        </div>
        <p className="k-lead">{journeyTexts.lead}</p>
      </header>
      <WithCossack>{({ progress }) => <Campaigns progress={progress} />}</WithCossack>
    </KozakScreen>
  );
}

function Campaigns({ progress }: { progress: JourneyProgress }) {
  // The campaign the player can take comes first; the final battle closes the list.
  const regular = progress.campaigns.filter(({ campaign }) => !campaign.final);
  const ordered = [...regular.filter(({ status }) => status !== 'locked'), ...regular.filter(({ status }) => status === 'locked')];
  const finale = progress.campaigns.filter(({ campaign }) => campaign.final);

  return (
    <>
      <ul className="k-campaigns" role="list">
        {ordered.map((item) => (
          <li key={item.campaign.id}>
            <CampaignCard progress={item} />
          </li>
        ))}
      </ul>
      <ul className="k-campaigns k-campaigns--final" role="list">
        {finale.map((item) => (
          <li key={item.campaign.id}>
            <CampaignCard progress={item} />
          </li>
        ))}
      </ul>
    </>
  );
}

function CampaignCard({ progress }: { progress: CampaignProgress }) {
  const { campaign, status, passed, stages } = progress;
  const texts = campaignTexts[campaign.id];
  const open = status !== 'locked';

  return (
    <article className={`k-campaign k-campaign--${open ? 'open' : 'locked'}`}>
      <div className="k-campaign__art">
        <CampaignArt campaign={campaign.id} label={texts.lead} />
        <span className="k-campaign__badge">
          {status === 'done' ? (
            <Badge tone="done">{journeyTexts.passed}</Badge>
          ) : open ? (
            <Badge tone="open">{passed > 0 ? journeyTexts.started(passed, stages.length) : journeyTexts.available}</Badge>
          ) : (
            <Badge tone="locked">{journeyTexts.locked}</Badge>
          )}
        </span>
      </div>
      <div className="k-campaign__body">
        <h2 className="k-campaign__name">{texts.name}</h2>
        {campaign.peak !== null && <p className="k-campaign__exercise">{journeyTexts.peak(texts.exercise, campaign.peak)}</p>}
        <p className="k-campaign__lead">{texts.lead}</p>
        {open ? (
          <>
            <div className="k-campaign__progress">
              <p className="k-campaign__progress-head">
                <span>{journeyTexts.progress}</span>
                <b>{journeyTexts.stagesOf(passed, stages.length)}</b>
              </p>
              <Bar value={passed} max={stages.length} label={journeyTexts.stagesOf(passed, stages.length)} thin />
            </div>
            <Link className="k-button k-button--primary k-campaign__go" to={kozakPaths.campaign(campaign.id)}>
              {status === 'done' ? journeyTexts.review : passed > 0 ? journeyTexts.continue : journeyTexts.enter}
            </Link>
          </>
        ) : (
          <div className="k-campaign__closed">
            <button type="button" className="k-button k-button--locked" disabled>
              <KozakIcon name="lock" className="k-button__icon" />
              {journeyTexts.unavailable}
            </button>
            <p className="k-campaign__hint">{campaign.final ? journeyTexts.finalLocked : journeyTexts.preparing}</p>
          </div>
        )}
      </div>
    </article>
  );
}
