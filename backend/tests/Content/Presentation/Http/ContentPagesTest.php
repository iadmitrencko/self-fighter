<?php

declare(strict_types=1);

namespace App\Tests\Content\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

final class ContentPagesTest extends WebTestCase
{
    // «Про проєкт» tells what happens in the game and leads into its screens.
    public function testAboutTellsWhatHappensInTheGame(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/about');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextSame('h1', 'Про проєкт');
        self::assertSame(
            ['Твій козак', 'Бій', 'Похід «Січ»', 'Енергія', 'Результати', "Здоров'я"],
            self::texts($crawler, '.prose h2'),
        );
        self::assertSame(
            ['/game/fight', '/game/journey', '/game/history', '/game/settings', 'https://www.who.int/news-room/fact-sheets/detail/physical-activity'],
            self::links($crawler->filter('.prose')),
        );
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

    public function testBreadcrumbsLeadHome(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/privacy');

        self::assertSame(['/'], self::links($crawler->filter('.breadcrumbs')));
        self::assertSame('Приватність', $crawler->filter('.breadcrumbs [aria-current="page"]')->text());
    }

    // Section 6.3: unknown addresses are a real 404, and an address never ends with a slash.
    public function testUnknownPagesAreNotFound(): void
    {
        $client = self::createClient();

        foreach (['/about/unknown', '/About', '/terms'] as $path) {
            $client->request('GET', $path);

            self::assertResponseStatusCodeSame(404, $path);
        }
        foreach (['/about/' => '/about', '/privacy/' => '/privacy'] as $path => $target) {
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
