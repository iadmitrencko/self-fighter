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
            // The content is in the HTML of the server, the game is not loaded.
            self::assertCount(0, $crawler->filter('#root'), $url);
            $this->assertStructuredData($crawler, $url);
            $titles[$url] = $title;
            $descriptions[$url] = $description;
        }

        // §24.1: everything else is the game, which search engines do not index.
        self::assertSame(
            ['/', '/about', '/privacy'],
            array_map(static fn (string $url): string => substr($url, \strlen(self::SITE)), array_keys($titles)),
        );
        self::assertSame(array_unique($titles), $titles);
        self::assertSame(array_unique($descriptions), $descriptions);
    }

    // A page that is not ready stays on the site, but search engines do not take it.
    public function testDraftsStayOnTheSiteButOutOfTheIndex(): void
    {
        $client = self::createClient();
        $this->reviewEverything();
        $this->database()->executeStatement("UPDATE content_page SET reviewed = 0 WHERE slug = 'privacy'");
        $sitemap = $this->sitemap($client);

        self::assertNotContains(self::SITE.'/privacy', $sitemap);
        $crawler = $client->request('GET', '/privacy');
        self::assertResponseIsSuccessful();
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
        self::assertCount(1, $client->request('GET', '/')->filter('footer a[href="/privacy"]'));
        self::assertContains(self::SITE.'/about', $sitemap);
    }

    // Every page is reachable from the landing, not through the sitemap alone.
    public function testTheLandingLeadsToEveryPage(): void
    {
        $client = self::createClient();
        $links = $client->request('GET', '/')->filter('a')->each(static fn (Crawler $link): string => (string) $link->attr('href'));
        $pages = array_map(
            static fn (string $slug): string => '/'.$slug,
            $this->database()->fetchFirstColumn('SELECT slug FROM content_page'),
        );

        self::assertCount(2, $pages);
        self::assertSame([], array_values(array_diff($pages, $links)));
    }

    public function testTheGameIsNeverIndexed(): void
    {
        $client = self::createClient();
        $this->reviewEverything();

        foreach (['/game', '/game/fight'] as $path) {
            $crawler = $client->request('GET', $path);

            self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'), $path);
        }
        self::assertSame([], array_filter($this->sitemap($client), static fn (string $url): bool => str_contains($url, '/game')));
    }

    public function testSitemapTellsWhenEachPageChanged(): void
    {
        $client = self::createClient();
        $this->reviewEverything();
        $this->database()->executeStatement("UPDATE content_page SET updated_at = '2026-12-01 00:00:00' WHERE slug = 'privacy'");
        $client->request('GET', '/sitemap.xml');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/xml; charset=UTF-8');
        $changes = [];

        foreach ((new \SimpleXMLElement((string) $client->getResponse()->getContent()))->url as $url) {
            $changes[(string) $url->loc] = isset($url->lastmod) ? (string) $url->lastmod : null;
        }
        self::assertNull($changes[self::SITE.'/']);
        self::assertSame('2026-12-01', $changes[self::SITE.'/privacy']);
        self::assertSame('2026-11-13', $changes[self::SITE.'/about']);
    }

    // Section 6.3: production opens the site to every crawler, AI search included.
    public function testRobotsOpenProductionToEveryCrawler(): void
    {
        $client = self::createClient();
        $client->request('GET', '/robots.txt');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'text/plain; charset=UTF-8');
        self::assertSame(
            "User-agent: *\nDisallow: /api/\nDisallow: /connect/\n\nSitemap: http://localhost/sitemap.xml\n",
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

        foreach (['/', '/about'] as $path) {
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
        $database->executeStatement('UPDATE content_page SET reviewed = 1');
    }

    private function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }
}
