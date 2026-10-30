// Target grid of one exercise (§6.4). A cell is manual once the user has set it for that round.
export interface TargetCell {
  readonly value: number | null;
  readonly manual: boolean;
}

export type TargetColumn = readonly TargetCell[];

function firstValue(column: TargetColumn): number | null {
  return column[0]?.value ?? null;
}

export function createTargetColumn(rounds: number): TargetColumn {
  return Array.from({ length: rounds }, () => ({ value: null, manual: false }));
}

export function setRoundTarget(
  column: TargetColumn,
  round: number,
  value: number | null,
): TargetColumn {
  if (round === 0) {
    return column.map((cell) => (cell.manual ? cell : { value, manual: false }));
  }

  // An emptied cell holds no user value, so it can be filled in again.
  return column.map((cell, index) =>
    index === round ? { value, manual: value !== null } : cell,
  );
}

export function fillAllRounds(column: TargetColumn): TargetColumn {
  const value = firstValue(column);

  return column.map(() => ({ value, manual: false }));
}

// Never shrinks: cells of removed rounds wait until the start, so a misclick loses no targets.
export function ensureRounds(column: TargetColumn, rounds: number): TargetColumn {
  const value = firstValue(column);
  const missing = Math.max(0, rounds - column.length);

  return [...column, ...Array.from({ length: missing }, () => ({ value, manual: false }))];
}

export function columnTargets(column: TargetColumn, rounds: number): (number | null)[] {
  return column.slice(0, rounds).map((cell) => cell.value);
}
