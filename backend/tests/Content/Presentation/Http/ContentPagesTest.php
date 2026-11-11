<?php

declare(strict_types=1);

namespace App\Tests\Content\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

final class ContentPagesTest extends WebTestCase
{
    // Section 6.3: guides are articles for search engines.
    public function testGuideIsAnArticle(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/guides/ladder-training');
        $article = null;

        foreach ($crawler->filter('script[type="application/ld+json"]') as $script) {
            $data = json_decode($script->textContent, true, 512, \JSON_THROW_ON_ERROR);
            $article = 'Article' === $data['@type'] ? $data : $article;
        }

        self::assertSame('article', $crawler->filter('meta[property="og:type"]')->attr('content'));
        self::assertIsArray($article);
        self::assertSame('Що таке тренування драбиною', $article['headline']);
        self::assertSame('2026-11-11', $article['dateModified']);
        self::assertSame('http://localhost/guides/ladder-training', $article['mainEntityOfPage']);
        // §24.1: a guide leads to a fight of the game and to the game itself.
        self::assertSame(['/game/fight', '/game'], self::links($crawler->filter('.page-cta')));
    }

    public function testHubListsTheGuides(): void
    {
        $client = self::createClient();

        self::assertSame(
            ['/guides/ladder-training', '/guides/motivation'],
            self::links($client->request('GET', '/guides')->filter('.cards')),
        );
        $client->request('GET', '/about');
        self::assertSelectorTextSame('h1', 'Про проєкт');
    }

    // §22: the page «Приватність» says which data is kept and why.
    public function testPrivacyExplainsWhatIsKeptAndWhy(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/privacy');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextSame('h1', 'Приватність');
        self::assertSame(
            ['Що зберігає сервер', 'Cookie пристрою', 'Вхід через Google', 'Аналітика', 'Твої дані під твоїм контролем', 'Чого на сайті немає'],
            self::texts($crawler, '.prose h2'),
        );
        self::assertCount(4, $crawler->filter('.prose ul li'));
        self::assertSame(['/game/settings'], self::links($crawler->filter('.prose')));
    }

    public function testBreadcrumbsLeadBackToTheHub(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/guides/motivation');

        self::assertSame(['/', '/guides'], self::links($crawler->filter('.breadcrumbs')));
        self::assertSame('Як змусити себе тренуватися', $crawler->filter('.breadcrumbs [aria-current="page"]')->text());
    }

    // Section 6.3: unknown addresses are a real 404, and an address never ends with a slash.
    public function testUnknownPagesAreNotFound(): void
    {
        $client = self::createClient();

        foreach (['/guides/unknown', '/guides/Ladder-Training'] as $path) {
            $client->request('GET', $path);

            self::assertResponseStatusCodeSame(404, $path);
        }
        foreach (['/guides/' => '/guides', '/guides/motivation/' => '/guides/motivation'] as $path => $target) {
            $client->request('GET', $path);

            self::assertResponseRedirects($target, 301, $path);
        }
    }

    /**
     * @return list<string>
     */
    private static function texts(Crawler $crawler, string $selector): array
    {
        return $crawler->filter($selector)->each(static fn (Crawler $node): string => trim($node->text()));
    }

    /**
     * @return list<string>
     */
    private static function links(Crawler $crawler): array
    {
        return $crawler->filter('a')->each(static fn (Crawler $link): string => (string) $link->attr('href'));
    }
}
