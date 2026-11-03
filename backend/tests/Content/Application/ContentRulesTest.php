<?php

declare(strict_types=1);

namespace App\Tests\Content\Application;

use App\Content\Application\Content as SiteContent;
use App\Content\Application\ContentRules;
use App\Content\Domain\PageType;
use App\Tests\Content\Content;
use PHPUnit\Framework\TestCase;

final class ContentRulesTest extends TestCase
{
    private const string NOTE = '<p>Сто віджимань за тренування звучать серйозно, але десять підходів по десять посильні для тих, хто впевнено робить 15–20 повторень за раз.</p>';

    public function testAcceptsContentThatKeepsTheRules(): void
    {
        $content = new SiteContent(
            [Content::exercise('push-ups', '<p>Техніка віджимань.</p>')],
            [Content::page(PageType::Mode, 'ladder', '<p>Етапи драбини.</p>')],
            [Content::challenge('50-push-ups', related: ['100-push-ups']), Content::challenge('100-push-ups', easier: '50-push-ups', note: '')],
        );

        self::assertSame([], (new ContentRules())->problems($content));
    }

    public function testFindsLinksToNothing(): void
    {
        $content = new SiteContent(
            [Content::exercise('push-ups')],
            [],
            [Content::challenge('100-burpees', exercises: ['burpees'], easier: '50-burpees', related: ['100-push-ups'])],
        );

        self::assertSame([
            'Challenge 100-burpees uses the unknown exercise burpees.',
            'Challenge 100-burpees links to the unknown challenge 50-burpees.',
            'Challenge 100-burpees links to the unknown challenge 100-push-ups.',
        ], (new ContentRules())->problems($content));
    }

    // A page of a mode and a challenge open the game, so their mode must exist there.
    public function testFindsModesTheGameDoesNotHave(): void
    {
        $content = new SiteContent(
            [Content::exercise('push-ups')],
            [Content::page(PageType::Mode, 'boxing'), Content::page(PageType::Guide, 'boxing')],
            [Content::challenge('100-push-ups', mode: 'boxing')],
        );

        self::assertSame([
            'Mode page boxing is not named after a mode of the game.',
            'Challenge 100-push-ups has the unknown mode boxing.',
        ], (new ContentRules())->problems($content));
    }

    // Section 6.3 of the plan: every page has a title and a description of its own.
    public function testFindsRepeatedTitlesAndDescriptions(): void
    {
        $content = new SiteContent([Content::exercise('push-ups'), Content::exercise('push-ups')], [], []);

        self::assertSame([
            'Exercise push-ups has the same title as exercise push-ups.',
            'Exercise push-ups has the same description as exercise push-ups.',
        ], (new ContentRules())->problems($content));
    }

    // §21.4: a near-copy is found among the drafts too, before anyone reviews it.
    public function testFindsNearCopiesOfTexts(): void
    {
        $copy = str_replace(['Сто', '15–20'], ['Двісті', '25–30'], self::NOTE);
        $content = new SiteContent(
            [Content::exercise('push-ups', self::NOTE)],
            [],
            [Content::challenge('100-push-ups', note: ''), Content::challenge('200-push-ups', note: $copy, reviewed: false)],
        );

        self::assertSame(
            ['Exercise push-ups and challenge 200-push-ups share 90% of their text.'],
            (new ContentRules())->problems($content),
        );
    }
}
