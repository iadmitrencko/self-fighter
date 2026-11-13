<?php

declare(strict_types=1);

namespace App\Tests\Content\Application;

use App\Content\Application\Content as SiteContent;
use App\Content\Application\ContentRules;
use App\Content\Application\ContentSource;
use App\Content\Application\InvalidContent;
use App\Content\Application\SyncContent;
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
            [Content::exercise('side-plank', 2), Content::exercise('plank')],
            [Content::page(PageType::Service, 'terms')],
        ));
        $slugs = static fn (array $items): array => array_map(static fn ($item): string => $item->slug(), $items);

        // In the order of the catalog.
        self::assertSame(['plank', 'side-plank'], $slugs(self::service(ExerciseRepository::class)->all()));
        self::assertSame(['terms'], $slugs(self::service(PageRepository::class)->ofType(PageType::Service)));
    }

    // A broken release never reaches the site, not even in part.
    public function testLeavesTheSiteAsItWasWhenTheContentIsBroken(): void
    {
        $database = self::service(Connection::class);
        $before = $database->fetchFirstColumn('SELECT slug FROM exercise ORDER BY position');

        try {
            $this->sync(new SiteContent([Content::exercise('plank'), Content::exercise('plank', 2)], [Content::page(PageType::Service, 'terms')]));
            self::fail('The broken content reached the site.');
        } catch (InvalidContent $invalid) {
            self::assertSame(['Exercise plank appears more than once.'], $invalid->problems);
        }
        self::assertSame(['push-ups', 'squats', 'pull-ups'], $before);
        self::assertSame($before, $database->fetchFirstColumn('SELECT slug FROM exercise ORDER BY position'));
        self::assertSame(2, (int) $database->fetchOne('SELECT COUNT(*) FROM content_page'));
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
