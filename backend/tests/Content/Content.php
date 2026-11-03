<?php

declare(strict_types=1);

namespace App\Tests\Content;

use App\Content\Domain\Article;
use App\Content\Domain\Challenge;
use App\Content\Domain\Demand;
use App\Content\Domain\Exercise;
use App\Content\Domain\Level;
use App\Content\Domain\Page;
use App\Content\Domain\PageType;

// Pages of content for tests, each with a title and a description of its own.
final class Content
{
    public static function article(string $name, string $html = ''): Article
    {
        return new Article('Title of '.$name, 'Description of '.$name, 'Heading of '.$name, 'Lead of '.$name, $html);
    }

    public static function exercise(string $slug, string $html = '', bool $reviewed = true): Exercise
    {
        return new Exercise($slug, ucfirst($slug), true, 1, self::article('exercise '.$slug, $html), $reviewed, new \DateTimeImmutable('2026-11-03'));
    }

    public static function page(PageType $type, string $slug, string $html = ''): Page
    {
        return new Page($type, $slug, 1, self::article($type->value.' '.$slug, $html), true, new \DateTimeImmutable('2026-11-03'));
    }

    /**
     * @param list<string> $exercises
     * @param list<string> $related
     */
    public static function challenge(
        string $slug,
        array $exercises = ['push-ups'],
        string $mode = 'target',
        string $note = '<p>A text of its own.</p>',
        bool $reviewed = true,
        Demand $demand = Demand::Verified,
        ?string $easier = null,
        array $related = [],
    ): Challenge {
        return new Challenge(
            $slug,
            $mode,
            $exercises,
            Level::Easy,
            $demand,
            ['mode' => $mode],
            ['kind' => 'rounds'],
            1,
            10,
            $easier,
            null,
            $related,
            1,
            self::article('challenge '.$slug),
            $note,
            $reviewed,
            new \DateTimeImmutable('2026-11-03'),
        );
    }
}
