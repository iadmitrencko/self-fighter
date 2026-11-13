import type { JourneySession } from '../../../domain/engine/session';
import { levelPlace } from '../../../domain/kozak/place';
import { battleTexts, duelTexts } from '../../../i18n/kozak';
import { levelText } from '../../../i18n/kozak-story';
import { useGame } from '../../game';
import { Battle, type BattleView } from '../battle/Battle';
import { kozakPaths } from '../paths';
import { scheme } from './common';

// A level of the journey shows its exercise once; a round of the duel names the exercise of every set.
const JOURNEY: BattleView<JourneySession> = {
  title: (session) =>
    session.mode === 'duel'
      ? duelTexts.battleTitle(levelPlace(session.config.round)?.number ?? 0, levelText(session.config.round).name)
      : levelText(session.config.level).name,
  subtitle: (session) =>
    session.mode === 'duel'
      ? duelTexts.battleSubtitle(session.stages.length)
      : battleTexts.exercise(session.config.exercise.name, scheme(session.config.sets)),
  current: (session, index) => ({
    label: battleTexts.set,
    value: (
      <>
        {index + 1} <span>/ {session.stages.length}</span>
      </>
    ),
    repsLabel: session.mode === 'duel' ? (session.stages[index]?.exercise.name ?? '') : battleTexts.doReps,
  }),
  retreatText: battleTexts.retreatText,
};

// §24.9: a retreat from the duel keeps the damage done.
const DUEL: BattleView<JourneySession> = { ...JOURNEY, retreatText: duelTexts.retreatText };

// §24.5, §24.9: a level of the journey or a round of the duel, set by set; a retreat leaves it lost.
export function BattleScreen() {
  const { storage } = useGame();
  const session = storage.gameSessions.campaign.load();

  return (
    <Battle
      store={storage.gameSessions.campaign}
      exitTo={kozakPaths.journey}
      resultOf={kozakPaths.outcome}
      view={session?.mode === 'duel' ? DUEL : JOURNEY}
    />
  );
}
