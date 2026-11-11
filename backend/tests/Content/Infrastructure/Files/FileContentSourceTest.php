<?php

declare(strict_types=1);

namespace App\Tests\Content\Infrastructure\Files;

use App\Content\Application\InvalidContent;
use App\Content\Domain\PageType;
use App\Content\Infrastructure\Files\FileContentSource;
use PHPUnit\Framework\TestCase;

final class FileContentSourceTest extends TestCase
{
    public function testReadsTheExercisesAndThePages(): void
    {
        $content = (new FileContentSource(__DIR__.'/fixtures/valid'))->read();

        // §5.1: the order of the file is the order of the catalog of the game.
        self::assertSame(
            [['plank', 'Планка', 1], ['side-plank', 'Бічна планка', 2]],
            array_map(static fn ($exercise): array => [$exercise->slug(), $exercise->name(), $exercise->position()], $content->exercises),
        );
        // YAML reads an unquoted date as a timestamp and a quoted one as a text.
        self::assertSame(
            [[PageType::Guide, 'tip', '2026-10-03', true], [PageType::Service, 'about', '2026-10-04', false]],
            array_map(static fn ($page): array => [$page->type(), $page->slug(), $page->updatedAt()->format('Y-m-d'), $page->indexable()], $content->pages),
        );
        self::assertSame('Вступ до поради.', $content->pages[0]->article()->lead);
    }

    // The authors write Markdown: HTML and scripts in a file are shown as text, never run.
    public function testRendersMarkdownWithoutRawHtml(): void
    {
        $html = (new FileContentSource(__DIR__.'/fixtures/valid'))->read()->pages[0]->article()->html;

        self::assertStringStartsWith('<h2>Техніка</h2>', $html);
        self::assertStringContainsString('<table>', $html);
        self::assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        self::assertStringNotContainsString('<script', $html);
        self::assertStringNotContainsString('javascript:', $html);
    }

    // Every problem at once, with the file to fix.
    public function testNamesEveryBrokenFile(): void
    {
        try {
            (new FileContentSource(__DIR__.'/fixtures/invalid'))->read();
            self::fail('The broken content was accepted.');
        } catch (InvalidContent $invalid) {
            self::assertSame([
                'invalid/exercises.yaml, exercise 1: "name" must be a text.',
                'invalid/exercises.yaml, exercise 2: "slug" must be a text.',
                'invalid/exercises.yaml, exercise 3: "Not A Slug" is not a slug.',
                'invalid/exercises.yaml, exercise 4: "slug" must be a text.',
                'invalid/guides/no-front-matter.md: The file has no front matter.',
                'invalid/pages/long-title.md: The title "Заголовок, довший за шістдесят символів, який пошук усе одно обріже" is longer than 60 characters.',
            ], $invalid->problems);
        }
    }

    // The game cannot offer its ready-made exercises without the catalog.
    public function testNeedsTheCatalogOfExercises(): void
    {
        try {
            (new FileContentSource(__DIR__.'/fixtures'))->read();
            self::fail('Content without exercises was accepted.');
        } catch (InvalidContent $invalid) {
            self::assertSame(['fixtures/exercises.yaml: the catalog of exercises of the game is missing.'], $invalid->problems);
        }
    }
}
