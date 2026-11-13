import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CampaignId } from '../../../domain/kozak/journey';
import type { Look } from '../../../domain/kozak/ranks';
import { campaignTexts, lookTexts } from '../../../i18n/kozak';
import { CossackFigure } from './Cossack';
import { CampaignArt } from './Scenes';

/*
 * The landing (backend/templates/home) shows the pictures of the game, but Twig renders no React:
 * it keeps copies of them, and this test keeps the copies the same as the game. When a picture
 * changes, `npx vitest run -u` writes its copy anew.
 */
const LANDING = '../../../../../backend/templates/home/art';
const CAMPAIGNS: readonly CampaignId[] = ['black-flag', 'steppe-wolves', 'forest-ravens', 'final-battle'];
const LOOKS: readonly Look[] = ['recruit', 'cossack', 'officer', 'general', 'hetman'];

const pictures: readonly (readonly [string, ReactElement])[] = [
  ...CAMPAIGNS.map((campaign) => [`campaign-${campaign}`, <CampaignArt campaign={campaign} label={campaignTexts[campaign].lead} />] as const),
  ...LOOKS.map((look) => [`cossack-${look}`, <CossackFigure look={look} label={lookTexts[look].figure} />] as const),
  // The hetman greets the visitor at the top as well, so he needs gradients of his own there.
  ['hero', <CossackFigure look="hetman" label={lookTexts.hetman.figure} />],
];

describe('the pictures of the landing', () => {
  it.each(pictures)('copies %s from the game', async (name, picture) => {
    // A prefix of its own keeps the gradients of the picture apart from those of the others on the page.
    const markup = renderToStaticMarkup(picture, { identifierPrefix: `${name}-` });

    await expect(`${markup}\n`).toMatchFileSnapshot(`${LANDING}/${name}.svg.twig`);
  });
});
