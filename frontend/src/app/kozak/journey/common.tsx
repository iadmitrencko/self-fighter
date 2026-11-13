import { useParams } from 'react-router';
import type { ExerciseRef } from '../../../domain/catalog/exercise';
import type { JourneySession } from '../../../domain/engine/session';
import {
  findCampaign,
  findLevel,
  findStage,
  SICH,
  type CampaignDefinition,
  type LevelDefinition,
  type StageDefinition,
} from '../../../domain/kozak/journey';
import { campaignTexts, kozakTexts, resultTexts } from '../../../i18n/kozak';
import { levelName } from '../../../i18n/kozak-names';
import type { AttemptStatus } from '../../../storage/contract';
import { Title } from '../../components/Screen';
import { useGame } from '../../game';
import { kozakPaths } from '../paths';
import { KozakScreen } from '../parts';
import { Link } from 'react-router';

// The campaign, the stage and the level an address names, each only when the journey has it.
export function useJourneyPlace(): {
  campaign: CampaignDefinition | null;
  stage: StageDefinition | null;
  level: LevelDefinition | null;
} {
  const params = useParams();
  const campaign = findCampaign(SICH, params.campaign ?? '');
  const stage = campaign === null ? null : findStage(campaign, Number(params.stage));
  const level = stage === null ? null : findLevel(SICH, `${stage.campaign}/${stage.number}/${params.level ?? ''}`);

  return { campaign, stage, level };
}

// The ready-made exercise of a campaign as the catalog of the site names it (§5.1).
export function useCampaignExercise(campaign: CampaignDefinition): ExerciseRef {
  const { exercises } = useGame();
  const id = campaign.exercise ?? '';

  return exercises.find((exercise) => exercise.id === id) ?? { id, name: campaignTexts[campaign.id].exercise };
}

// The battle of the journey in progress by its name: a level, or a round of the duel with the King.
export function journeyBattleName(session: JourneySession): string {
  return levelName(session.mode === 'duel' ? session.config.round : session.config.level);
}

// «1-1-1», as the brief writes the sets of a level; a long level in short: «10 × 1», «1 → 10 → 1».
export function scheme(sets: readonly number[]): string {
  const top = Math.max(...sets);
  const climb = Array.from({ length: top }, (_, index) => index + 1);
  const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

  if (sets.length <= 5) {
    return sets.join('-');
  }
  if (sets.every((reps) => reps === sets[0])) {
    return `${sets.length} × ${top}`;
  }
  if (same(sets, climb)) {
    return `1 → ${top}`;
  }
  if (same(sets, [...climb, ...climb.slice(0, -1).reverse()])) {
    return `1 → ${top} → 1`;
  }

  return sets.join('-');
}

export function KozakNotFound() {
  return (
    <KozakScreen title={kozakTexts.notFound}>
      <header className="k-head">
        <Title className="k-title">{kozakTexts.notFound}</Title>
        <p className="k-lead">{kozakTexts.notFoundText}</p>
      </header>
      <div className="k-actions">
        <Link className="k-button k-button--primary" to={kozakPaths.journey}>
          {kozakTexts.nav.journey}
        </Link>
        <Link className="k-button k-button--secondary" to={kozakPaths.cossack}>
          {kozakTexts.toCossack}
        </Link>
      </div>
    </KozakScreen>
  );
}

// §15.4: a battle that has not reached the server yet says so, and so does one it refused.
export function Pending({ status }: { status: AttemptStatus }) {
  if (status === 'saved') {
    return null;
  }

  return <p className="notice notice--warning">{status === 'pending' ? resultTexts.pending : resultTexts.rejected}</p>;
}
