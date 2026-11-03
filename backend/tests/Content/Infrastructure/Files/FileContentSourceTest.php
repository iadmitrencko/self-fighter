<?php

declare(strict_types=1);

namespace App\Tests\Content\Infrastructure\Files;

use App\Content\Application\InvalidContent;
use App\Content\Domain\Demand;
use App\Content\Domain\Level;
use App\Content\Domain\PageType;
use App\Content\Infrastructure\Files\FileContentSource;
use PHPUnit\Framework\TestCase;

final class FileContentSourceTest extends TestCase
{
    public function testReadsEveryKindOfContent(): void
    {
        $content = (new FileContentSource(__DIR__.'/fixtures/valid'))->read();
        [$plank] = $content->exercises;

        self::assertSame('plank', $plank->slug());
        self::assertSame('Планка', $plank->name());
        self::assertFalse($plank->inGame());
        self::assertSame(2, $plank->position());
        self::assertSame('Планка: техніка', $plank->article()->title);
        self::assertTrue($plank->indexable());
        // YAML reads an unquoted date as a timestamp and a quoted one as a text.
        self::assertEquals(new \DateTimeImmutable('2026-10-01 00:00:00 UTC'), $plank->updatedAt());
        self::assertSame(
            [[PageType::Mode, 'ladder', '2026-10-02'], [PageType::Guide, 'tip', '2026-10-03'], [PageType::Service, 'about', '2026-10-04']],
            array_map(static fn ($page): array => [$page->type(), $page->slug(), $page->updatedAt()->format('Y-m-d')], $content->pages),
        );
        self::assertStringContainsString('<table>', $content->pages[0]->article()->html);
    }

    // The authors write Markdown: HTML and scripts in a file are shown as text, never run.
    public function testRendersMarkdownWithoutRawHtml(): void
    {
        $html = (new FileContentSource(__DIR__.'/fixtures/valid'))->read()->exercises[0]->article()->html;

        self::assertStringStartsWith('<h2>Техніка</h2>', $html);
        self::assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        self::assertStringNotContainsString('<script', $html);
        self::assertStringNotContainsString('javascript:', $html);
    }

    // §21.4: the text of a challenge lives next to the matrix; without it the page stays out of the index.
    public function testJoinsAChallengeWithItsOwnText(): void
    {
        [$two, $four] = (new FileContentSource(__DIR__.'/fixtures/valid'))->read()->challenges;

        self::assertSame('two-planks', $two->slug());
        self::assertSame(Level::Easy, $two->level());
        self::assertSame(Demand::Verified, $two->demand());
        self::assertSame(['plank'], $two->exercises());
        self::assertSame(['mode' => 'target', 'rule' => 'meet', 'rounds' => 2, 'exercises' => [['id' => 'plank', 'name' => 'Планка', 'targets' => [1, 1]]]], $two->config());
        self::assertSame('four-planks', $two->harder());
        self::assertSame('<p>Дві планки — <strong>легкий</strong> початок.</p>', $two->note());
        self::assertTrue($two->indexable());
        // The later of the matrix and of the text.
        self::assertSame('2026-10-05', $two->updatedAt()->format('Y-m-d'));
        self::assertSame('', $four->note());
        self::assertFalse($four->indexable());
        self::assertSame('2026-10-02', $four->updatedAt()->format('Y-m-d'));
    }

    // Every problem at once, with the file to fix.
    public function testNamesEveryBrokenFile(): void
    {
        try {
            (new FileContentSource(__DIR__.'/fixtures/invalid'))->read();
            self::fail('The broken content was accepted.');
        } catch (InvalidContent $invalid) {
            self::assertSame([
                'invalid/exercises/no-title.md: "title" must be a text.',
                'invalid/guides/no-front-matter.md: The file has no front matter.',
                'invalid/pages/long-title.md: The title "Заголовок, довший за шістдесят символів, який пошук усе одно обріже" is longer than 60 characters.',
                'invalid/challenges/generated.json: "updated" of challenge "extreme" must be a text.',
                'invalid/challenges/generated.json: "slug" of a challenge must be a text.',
                'invalid/challenges/generated.json: A challenge must be an object.',
            ], $invalid->problems);
        }
    }

    public function testNeedsNoChallengesToWork(): void
    {
        self::assertSame([], (new FileContentSource(__DIR__.'/fixtures'))->read()->challenges);
    }
}
