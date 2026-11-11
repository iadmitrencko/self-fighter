import { describe, expect, it } from 'vitest';
import { allLevels, SICH } from './journey';
import { levelPlace } from './place';

describe('the place of a level', () => {
  it('is read from the id of every level of the journey', () => {
    for (const { id, campaign, stage, number } of allLevels(SICH)) {
      expect(levelPlace(id)).toEqual({ campaign, stage, number });
    }
  });

  it.each(['forest-ravens/1', 'forest-ravens/0/1', 'Forest/1/1', 'forest-ravens/1/1/1', ''])('is not read from «%s»', (id) => {
    expect(levelPlace(id)).toBeNull();
  });
});
