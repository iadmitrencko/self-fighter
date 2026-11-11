<?php

declare(strict_types=1);

namespace App\Tests\Content;

use App\Content\Domain\Article;
use App\Content\Domain\Exercise;
use App\Content\Domain\Page;
use App\Content\Domain\PageType;

// Content for tests: exercises of the catalog and pages, each with a title and a description of its own.
final class Content
{
    public static function article(string $name, string $html = ''): Article
    {
        return new Article('Title of '.$name, 'Description of '.$name, 'Heading of '.$name, 'Lead of '.$name, $html);
    }

    public static function exercise(string $slug, int $position = 1): Exercise
    {
        return new Exercise($slug, ucfirst($slug), $position);
    }

    public static function page(PageType $type, string $slug, string $html = ''): Page
    {
        return new Page($type, $slug, 1, self::article($type->value.' '.$slug, $html), true, new \DateTimeImmutable('2026-11-03'));
    }
}
