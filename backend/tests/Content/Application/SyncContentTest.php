<?php

declare(strict_types=1);

namespace App\Tests\Content\Application;

use App\Content\Application\Content as SiteContent;
use App\Content\Application\ContentRules;
use App\Content\Application\ContentSource;
use App\Content\Application\InvalidContent;
use App\Content\Application\SyncContent;
use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\ExerciseRepository;
use App\Content\Domain\PageRepository;
use App\Content\Domain\PageType;
use App\Shared\Application\Transaction;
use App\Tests\Content\Content;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class SyncContentTest extends KernelTestCase
{
    // The site shows exactly what the files hold: what left them leaves the site.
    public function testReplacesTheContentOfTheSite(): void
    {
        $this->sync(new SiteContent(
            [Content::exercise('plank')],
            [Content::page(PageType::Guide, 'breathing')],
            [Content::challenge('two-planks', exercises: ['plank'])],
        ));
        $slugs = static fn (array $items): array => array_map(static fn ($item): string => $item->slug(), $items);

        self::assertSame(['plank'], $slugs(self::service(ExerciseRepository::class)->all()));
        self::assertSame(['breathing'], $slugs(self::service(PageRepository::class)->ofType(PageType::Guide)));
        self::assertSame([], self::service(PageRepository::class)->ofType(PageType::Mode));
        self::assertSame(['two-planks'], $slugs(self::service(ChallengeRepository::class)->all()));
        self::assertSame(['two-planks'], $slugs(self::service(ChallengeRepository::class)->withExercise('plank')));
    }

    // A broken release never reaches the site, not even in part.
    public function testLeavesTheSiteAsItWasWhenTheContentIsBroken(): void
    {
        $database = self::service(Connection::class);
        $before = $database->fetchFirstColumn('SELECT slug FROM challenge ORDER BY slug');

        try {
            $this->sync(new SiteContent([Content::exercise('plank')], [], [Content::challenge('two-burpees', exercises: ['burpees'])]));
            self::fail('The broken content reached the site.');
        } catch (InvalidContent $invalid) {
            self::assertSame(['Challenge two-burpees uses the unknown exercise burpees.'], $invalid->problems);
        }
        self::assertSame($before, $database->fetchFirstColumn('SELECT slug FROM challenge ORDER BY slug'));
        self::assertSame(3, (int) $database->fetchOne('SELECT COUNT(*) FROM exercise'));
    }

    private function sync(SiteContent $content): void
    {
        $source = new class($content) implements ContentSource {
            public function __construct(private readonly SiteContent $content)
            {
            }

            public function read(): SiteContent
            {
                return $this->content;
            }
        };

        (new SyncContent(
            $source,
            new ContentRules(),
            self::service(ExerciseRepository::class),
            self::service(PageRepository::class),
            self::service(ChallengeRepository::class),
            self::service(Transaction::class),
        ))();
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return T
     */
    private static function service(string $class): object
    {
        $service = self::getContainer()->get($class);
        self::assertInstanceOf($class, $service);

        return $service;
    }
}
