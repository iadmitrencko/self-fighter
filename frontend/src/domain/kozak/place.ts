// §24.5: the campaign, stage and number a level of the journey is known by, such as forest-ravens/1/2.
export interface LevelPlace {
  readonly campaign: string;
  readonly stage: number;
  readonly number: number;
}

// Reads the id alone, so the history can name a level without the whole journey.
export function levelPlace(id: string): LevelPlace | null {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\/([1-9][0-9]?)\/([1-9][0-9]?)$/.exec(id);

  return match === null ? null : { campaign: match[1] as string, stage: Number(match[2]), number: Number(match[3]) };
}
