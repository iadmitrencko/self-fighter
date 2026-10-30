import type { ExerciseRef } from '../catalog/exercise';
import type { WinRule } from '../config/types';

// target is a goal, an opponent's result or a ladder step. rule is the one this stage applies.
export interface Stage {
  readonly target: number;
  readonly rule: WinRule;
  readonly actual: number | null;
}

export interface FightStage extends Stage {
  readonly round: number;
  readonly exercise: ExerciseRef;
}

export function passesTarget(actual: number, target: number, rule: WinRule): boolean {
  return rule === 'over' ? actual > target : actual >= target;
}

// The top of a ladder never has to be exceeded (R2).
export function ladderStageRule(target: number, max: number, rule: WinRule): WinRule {
  return target === max ? 'meet' : rule;
}

export function stagePassed({ actual, target, rule }: Stage): boolean {
  return actual !== null && passesTarget(actual, target, rule);
}
