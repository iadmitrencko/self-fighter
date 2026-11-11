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
    private const string TEXT = '<p>Сто віджимань за тренування звучать серйозно, але десять підходів по десять посильні для тих, хто впевнено робить 15–20 повторень за раз.</p>';

    public function testAcceptsContentThatKeepsTheRules(): void
    {
        $content = new SiteContent(
            [Content::exercise('push-ups'), Content::exercise('squats', 2)],
            [Content::page(PageType::Guide, 'ladder-training', '<p>Етапи драбини.</p>'), Content::page(PageType::Service, 'about', '<p>Про гру.</p>')],
        );

        self::assertSame([], (new ContentRules())->problems($content));
    }

    // Attempts know an exercise by its slug, so the catalog names each one once.
    public function testFindsAnExerciseNamedTwice(): void
    {
        $content = new SiteContent([Content::exercise('push-ups'), Content::exercise('squats', 2), Content::exercise('push-ups', 3)], []);

        self::assertSame(['Exercise push-ups appears more than once.'], (new ContentRules())->problems($content));
    }

    // Section 6.3 of the plan: every page has a title and a description of its own.
    public function testFindsRepeatedTitlesAndDescriptions(): void
    {
        $content = new SiteContent([Content::exercise('push-ups')], [Content::page(PageType::Guide, 'tip'), Content::page(PageType::Guide, 'tip')]);

        self::assertSame([
            'Guide page tip has the same title as guide page tip.',
            'Guide page tip has the same description as guide page tip.',
        ], (new ContentRules())->problems($content));
    }

    // A near-copy is found among the drafts too, before anyone reviews it.
    public function testFindsNearCopiesOfTexts(): void
    {
        $copy = str_replace(['Сто', '15–20'], ['Двісті', '25–30'], self::TEXT);
        $content = new SiteContent(
            [Content::exercise('push-ups')],
            [Content::page(PageType::Guide, 'hundred', self::TEXT), Content::page(PageType::Guide, 'two-hundred', $copy)],
        );

        self::assertSame(
            ['Guide page hundred and guide page two-hundred share 90% of their text.'],
            (new ContentRules())->problems($content),
        );
    }
}
