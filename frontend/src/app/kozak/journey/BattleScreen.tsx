import type { CampaignSession } from '../../../domain/engine/session';
import { battleTexts, levelText } from '../../../i18n/kozak';
import { useGame } from '../../game';
import { Battle, type BattleView } from '../battle/Battle';
import { kozakPaths } from '../paths';
import { scheme } from './common';

const LEVEL: BattleView<CampaignSession> = {
  title: ({ config }) => levelText(config.level).name,
  subtitle: ({ config }) => battleTexts.exercise(config.exercise.name, scheme(config.sets)),
  current: ({ stages }, index) => ({
    label: battleTexts.set,
    value: (
      <>
        {index + 1} <span>/ {stages.length}</span>
      </>
    ),
    repsLabel: battleTexts.doReps,
  }),
  retreatText: battleTexts.retreatText,
};

// §24.5: a level of the journey, set by set; a retreat leaves it lost.
export function BattleScreen() {
  const { storage } = useGame();

  return (
    <Battle
      store={storage.gameSessions.campaign}
      exitTo={kozakPaths.journey}
      resultOf={kozakPaths.outcome}
      view={LEVEL}
    />
  );
}
