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
    private const string TEXT = '<p>Сто відтискань за тренування звучать серйозно, але десять підходів по десять посильні для тих, хто впевнено робить 15–20 повторень за раз.</p>';

    public function testAcceptsContentThatKeepsTheRules(): void
    {
        $content = new SiteContent(
            [Content::exercise('push-ups'), Content::exercise('squats', 2)],
            [Content::page(PageType::Service, 'privacy', '<p>Що зберігає сервер.</p>'), Content::page(PageType::Service, 'about', '<p>Про гру.</p>')],
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
        $content = new SiteContent([Content::exercise('push-ups')], [Content::page(PageType::Service, 'tip'), Content::page(PageType::Service, 'tip')]);

        self::assertSame([
            'Service page tip has the same title as service page tip.',
            'Service page tip has the same description as service page tip.',
        ], (new ContentRules())->problems($content));
    }

    // A near-copy is found among the drafts too, before anyone reviews it.
    public function testFindsNearCopiesOfTexts(): void
    {
        $copy = str_replace(['Сто', '15–20'], ['Двісті', '25–30'], self::TEXT);
        $content = new SiteContent(
            [Content::exercise('push-ups')],
            [Content::page(PageType::Service, 'hundred', self::TEXT), Content::page(PageType::Service, 'two-hundred', $copy)],
        );

        self::assertSame(
            ['Service page hundred and service page two-hundred share 90% of their text.'],
            (new ContentRules())->problems($content),
        );
    }
}
