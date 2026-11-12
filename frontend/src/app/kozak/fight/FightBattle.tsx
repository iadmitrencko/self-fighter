import { roundsOf } from '../../../domain/config/grid';
import type { FightSession } from '../../../domain/engine/session';
import { fightBattleTexts } from '../../../i18n/kozak';
import { useGame } from '../../game';
import { Battle, type BattleView } from '../battle/Battle';
import { kozakPaths } from '../paths';

const FIGHT: BattleView<FightSession> = {
  title: () => fightBattleTexts.title,
  subtitle: ({ config }) => fightBattleTexts.subtitle(config.exercises.length, roundsOf(config)),
  current: ({ config, stages }, index) => {
    const stage = stages[index];

    return {
      label: fightBattleTexts.round,
      value: (
        <>
          {(stage?.round ?? 0) + 1} <span>/ {roundsOf(config)}</span>
        </>
      ),
      repsLabel: stage?.exercise.name ?? '',
    };
  },
  retreatText: fightBattleTexts.retreatText,
};

// §6: a fight goes set by set, round by round, on the screen of a battle; a retreat loses it.
export function FightBattle() {
  const { storage, analytics } = useGame();

  return (
    <Battle
      store={storage.gameSessions.fight}
      exitTo={kozakPaths.fight}
      resultOf={kozakPaths.fightResult}
      view={FIGHT}
      onSaved={(attempt) => analytics.track({ name: 'workout_completed', mode: 'fight', outcome: attempt.result.outcome })}
    />
  );
}
