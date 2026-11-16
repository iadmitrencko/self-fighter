import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CampaignId } from '../../../domain/kozak/journey';
import { campaignTexts } from '../../../i18n/kozak';
import { CampaignArt } from './Scenes';

/*
 * The landing (backend/templates/home) shows the scenes of the game, but Twig renders no React: it
 * keeps copies of them, and this test keeps the copies the same as the game. When a scene changes,
 * `npx vitest run -u` writes its copy anew. The portraits of the cossack need no copies: the landing
 * shows the files of the game (cossack/*.webp).
 */
const LANDING = '../../../../../backend/templates/home/art';
const CAMPAIGNS: readonly CampaignId[] = ['black-flag', 'steppe-wolves', 'forest-ravens', 'final-battle'];

const pictures: readonly (readonly [string, ReactElement])[] = CAMPAIGNS.map(
  (campaign) => [`campaign-${campaign}`, <CampaignArt campaign={campaign} label={campaignTexts[campaign].lead} />] as const,
);

describe('the pictures of the landing', () => {
  it.each(pictures)('copies %s from the game', async (name, picture) => {
    // A prefix of its own keeps the gradients of the picture apart from those of the others on the page.
    const markup = renderToStaticMarkup(picture, { identifierPrefix: `${name}-` });

    await expect(`${markup}\n`).toMatchFileSnapshot(`${LANDING}/${name}.svg.twig`);
  });
});
