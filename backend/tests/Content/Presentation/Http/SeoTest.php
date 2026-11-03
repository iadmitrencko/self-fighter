<?php

declare(strict_types=1);

namespace App\Tests\Content\Presentation\Http;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

/**
 * Section 6.6 of the plan: every address of the sitemap is ready for search engines. The drafts are
 * checked as if a person had reviewed them, so publishing a reviewed text cannot break the site.
 */
final class SeoTest extends WebTestCase
{
    private const string SITE = 'http://localhost';

    protected function tearDown(): void
    {
        $_SERVER['SEO_INDEXING'] = $_ENV['SEO_INDEXING'] = '1';
        parent::tearDown();
    }

    public function testEveryPageOfTheSitemapIsReadyForSearchEngines(): void
    {
        $client = self::createClient();
        $this->reviewEverything();
        $titles = [];
        $descriptions = [];

        foreach ($this->sitemap($client) as $url) {
            $crawler = $client->request('GET', substr($url, \strlen(self::SITE)));
            $title = $crawler->filter('title')->text();
            $description = (string) $crawler->filter('meta[name="description"]')->attr('content');

            self::assertResponseIsSuccessful($url);
            self::assertCount(1, $crawler->filter('h1'), $url);
            self::assertCount(0, $crawler->filter('meta[name="robots"]'), $url);
            self::assertSame($url, $crawler->filter('link[rel="canonical"]')->attr('href'), $url);
            self::assertSame($url, $crawler->filter('meta[property="og:url"]')->attr('content'), $url);
            self::assertSame($title, $crawler->filter('meta[property="og:title"]')->attr('content'), $url);
            self::assertSame($description, $crawler->filter('meta[property="og:description"]')->attr('content'), $url);
            self::assertSame(self::SITE.'/og.png', $crawler->filter('meta[property="og:image"]')->attr('content'), $url);
            self::assertSame('uk_UA', $crawler->filter('meta[property="og:locale"]')->attr('content'), $url);
            self::assertNotSame('', $title, $url);
            self::assertLessThanOrEqual(60, mb_strlen($title), $url);
            self::assertNotSame('', $description, $url);
            self::assertLessThanOrEqual(155, mb_strlen($description), $url);
            // §21.2: the content is in the HTML of the server, the game is not loaded.
            self::assertCount(0, $crawler->filter('#root'), $url);
            $this->assertStructuredData($crawler, $url);
            $titles[$url] = $title;
            $descriptions[$url] = $description;
        }

        self::assertGreaterThanOrEqual(45, \count($titles));
        self::assertSame(array_unique($titles), $titles);
        self::assertSame(array_unique($descriptions), $descriptions);
    }

    // §21.4: a page that is not ready stays in the catalog, but search engines do not take it.
    public function testDraftsStayInTheCatalogButOutOfTheIndex(): void
    {
        $client = self::createClient();
        $this->reviewEverything();
        $database = $this->database();
        $database->executeStatement("UPDATE exercise SET reviewed = 0 WHERE slug = 'squats'");
        $database->executeStatement("UPDATE content_page SET reviewed = 0 WHERE slug = 'motivation'");
        $database->executeStatement("UPDATE challenge SET demand = 'unverified' WHERE slug = '100-push-ups'");
        $database->executeStatement("UPDATE challenge SET note = '' WHERE slug = '200-push-ups'");
        $database->executeStatement("UPDATE challenge SET reviewed = 0 WHERE slug = '50-push-ups'");
        $sitemap = $this->sitemap($client);
        $drafts = [
            '/exercises/squats' => '/exercises',
            '/guides/motivation' => '/guides',
            '/challenges/100-push-ups' => '/challenges',
            '/challenges/200-push-ups' => '/challenges',
            '/challenges/50-push-ups' => '/challenges',
        ];

        foreach ($drafts as $path => $hub) {
            self::assertNotContains(self::SITE.$path, $sitemap);
            $crawler = $client->request('GET', $path);
            self::assertResponseIsSuccessful($path);
            self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'), $path);
            self::assertCount(1, $client->request('GET', $hub)->filter(\sprintf('main a[href="%s"]', $path)), $path);
        }
        self::assertContains(self::SITE.'/challenges/300-squats', $sitemap);
    }

    // §21.4: every page is reachable through the hubs, not through the sitemap alone.
    public function testHubsLeadToEveryPage(): void
    {
        $client = self::createClient();
        $links = [];

        foreach (['/', '/challenges', '/exercises', '/modes', '/guides'] as $hub) {
            $links = [...$links, ...$client->request('GET', $hub)->filter('a')->each(
                static fn (Crawler $link): string => (string) $link->attr('href'),
            )];
        }
        $database = $this->database();
        $pages = [
            ...array_map(static fn (string $slug): string => '/challenges/'.$slug, $database->fetchFirstColumn('SELECT slug FROM challenge')),
            ...array_map(static fn (string $slug): string => '/exercises/'.$slug, $database->fetchFirstColumn('SELECT slug FROM exercise')),
            ...array_map(static fn (string $slug): string => '/modes/'.$slug, $database->fetchFirstColumn("SELECT slug FROM content_page WHERE type = 'mode'")),
            ...array_map(static fn (string $slug): string => '/guides/'.$slug, $database->fetchFirstColumn("SELECT slug FROM content_page WHERE type = 'guide'")),
            '/about',
            '/privacy',
        ];

        self::assertGreaterThanOrEqual(43, \count($pages));
        self::assertSame([], array_values(array_diff($pages, $links)));
    }

    public function testWorkoutIsNeverIndexed(): void
    {
        $client = self::createClient();
        $this->reviewEverything();

        foreach (['/workout', '/workout/challenge/100-push-ups'] as $path) {
            $crawler = $client->request('GET', $path);

            self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'), $path);
        }
        self::assertSame([], array_filter($this->sitemap($client), static fn (string $url): bool => str_contains($url, '/workout')));
    }

    public function testSitemapTellsWhenEachPageChanged(): void
    {
        $client = self::createClient();
        $this->reviewEverything();
        $this->database()->executeStatement("UPDATE challenge SET updated_at = '2026-12-01 00:00:00' WHERE slug = '100-squats'");
        $client->request('GET', '/sitemap.xml');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/xml; charset=UTF-8');
        $changes = [];

        foreach ((new \SimpleXMLElement((string) $client->getResponse()->getContent()))->url as $url) {
            $changes[(string) $url->loc] = isset($url->lastmod) ? (string) $url->lastmod : null;
        }
        self::assertNull($changes[self::SITE.'/']);
        self::assertSame('2026-12-01', $changes[self::SITE.'/challenges/100-squats']);
        // A hub changes with the pages it lists.
        self::assertSame('2026-12-01', $changes[self::SITE.'/challenges']);
        self::assertSame('2026-11-03', $changes[self::SITE.'/exercises/push-ups']);
    }

    // Section 6.3: production opens the site to every crawler, AI search included.
    public function testRobotsOpenProductionToEveryCrawler(): void
    {
        $client = self::createClient();
        $client->request('GET', '/robots.txt');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'text/plain; charset=UTF-8');
        self::assertSame(
            "User-agent: *\nDisallow: /api/\nDisallow: /connect/\nDisallow: /logout\n\nSitemap: http://localhost/sitemap.xml\n",
            $client->getResponse()->getContent(),
        );
    }

    // Development and staging never reach the index (SEO_INDEXING).
    public function testEveryOtherEnvironmentStaysClosed(): void
    {
        $_SERVER['SEO_INDEXING'] = $_ENV['SEO_INDEXING'] = '0';
        $client = self::createClient();
        $client->request('GET', '/robots.txt');

        self::assertSame("User-agent: *\nDisallow: /\n", $client->getResponse()->getContent());

        foreach (['/', '/challenges'] as $path) {
            $crawler = $client->request('GET', $path);

            self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'), $path);
        }
    }

    /**
     * @return list<string>
     */
    private function sitemap(KernelBrowser $client): array
    {
        $client->request('GET', '/sitemap.xml');
        $urls = [];

        foreach ((new \SimpleXMLElement((string) $client->getResponse()->getContent()))->url as $url) {
            $urls[] = (string) $url->loc;
        }

        return $urls;
    }

    private function assertStructuredData(Crawler $crawler, string $url): void
    {
        $types = [];

        foreach ($crawler->filter('script[type="application/ld+json"]') as $script) {
            $data = json_decode($script->textContent, true, 512, \JSON_THROW_ON_ERROR);
            self::assertIsArray($data);

            foreach (array_is_list($data) ? $data : [$data] as $item) {
                self::assertSame('https://schema.org', $item['@context'], $url);
                $types[] = $item['@type'];

                if ('BreadcrumbList' === $item['@type']) {
                    $crumbs = $item['itemListElement'];
                    self::assertSame(range(1, \count($crumbs)), array_column($crumbs, 'position'), $url);
                    self::assertSame(self::SITE.'/', $crumbs[0]['item'], $url);
                    self::assertArrayNotHasKey('item', $crumbs[\count($crumbs) - 1], $url);
                }
            }
        }
        self::assertContains(self::SITE.'/' === $url ? 'WebSite' : 'BreadcrumbList', $types, $url);
    }

    private function reviewEverything(): void
    {
        $database = $this->database();
        $database->executeStatement('UPDATE exercise SET reviewed = 1');
        $database->executeStatement('UPDATE content_page SET reviewed = 1');
        $database->executeStatement("UPDATE challenge SET reviewed = 1, demand = 'verified'");
    }

    private function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }
}
