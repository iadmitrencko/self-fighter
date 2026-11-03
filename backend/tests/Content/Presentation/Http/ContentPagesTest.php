<?php

declare(strict_types=1);

namespace App\Tests\Content\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

final class ContentPagesTest extends WebTestCase
{
    // §21.3: the page is useful without the game, and it leads into the game and to its neighbours.
    public function testChallengeShowsItsWholeProgram(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/challenges/100-push-ups');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextSame('h1', '100 віджимань');
        self::assertSame(['10', '100', 'Виконати'], self::texts($crawler, '.facts__value'));
        self::assertCount(10, $crawler->filter('.program tbody tr'));
        self::assertSame(['10'], array_values(array_unique(self::texts($crawler, '.program tbody td'))));
        self::assertSame(['100'], self::texts($crawler, '.program tfoot td'));
        self::assertSame(2, $crawler->filter('main a[href="/workout/challenge/100-push-ups"]')->count());
        self::assertSame(
            ['/challenges/50-push-ups', '/challenges/200-push-ups'],
            self::links($crawler->filter('#adjust')->ancestors()->first()),
        );
        self::assertSame(['/exercises/push-ups', '/modes/target'], self::links($crawler->filter('#links')->ancestors()->first()));
        self::assertSame(
            ['/challenges/push-ups-ladder-to-10', '/challenges/push-ups-pyramid-to-7', '/challenges/home-workout-medium'],
            self::links($crawler->filter('#related')->ancestors()->first()),
        );
        self::assertStringContainsString('Сто віджимань', $crawler->filter('#note')->ancestors()->first()->text());
        self::assertSelectorTextContains('.page-head .eyebrow', 'Ціль · Середній рівень');
        self::assertSame('100-push-ups', $crawler->filter('.page-head .eyebrow')->attr('data-challenge'));
        self::assertSame(' · Пройдено ✓', $crawler->filter('.page-head .passed-label')->text(normalizeWhitespace: false));
    }

    public function testLadderShowsEveryStage(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/challenges/push-ups-pyramid-to-10');

        self::assertSelectorTextSame('h1', 'Піраміда віджимань до 10');
        self::assertSame(['19', '100', 'Виконати'], self::texts($crawler, '.facts__value'));
        self::assertSame(
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
            self::texts($crawler, '.stages__item'),
        );
        self::assertSelectorTextContains('#adjust + p', 'вимкни повернення вниз');
    }

    public function testCircuitShowsEachExerciseOfEachRound(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/challenges/full-body-workout-easy');

        self::assertSame(['Раунд', 'Віджимання', 'Присідання', 'Підтягування'], self::texts($crawler, '.program thead th'));
        self::assertSame(['5', '10', '2'], self::texts($crawler->filter('.program tbody tr')->first(), 'td'));
        self::assertSame(['15', '30', '6'], self::texts($crawler, '.program tfoot td'));
        self::assertSame(
            ['/exercises/push-ups', '/exercises/squats', '/exercises/pull-ups', '/modes/target'],
            self::links($crawler->filter('#links')->ancestors()->first()),
        );
    }

    public function testCatalogGroupsChallengesByExercise(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/challenges');

        self::assertResponseIsSuccessful();
        // §21.3: the browser marks the challenges passed and counts them against the whole catalog.
        self::assertSame('– / 33', $crawler->filter('.catalog-progress__value')->text());
        self::assertCount(33, $crawler->filter('.challenge-card[data-challenge] .passed-mark'));
        self::assertSame('100-push-ups', $crawler->filter('.challenge-card')->eq(1)->attr('data-challenge'));
        self::assertSame(['Віджимання', 'Присідання', 'Підтягування', 'Кілька вправ'], self::texts($crawler, 'main h2'));
        self::assertCount(33, $crawler->filter('.challenge-card'));
        self::assertSame('Ціль · Легкий рівень', $crawler->filter('.challenge-card .eyebrow')->first()->text());
        self::assertSame('5 раундів · 50 повторень', $crawler->filter('.challenge-card__facts')->first()->text());
    }

    public function testExerciseLeadsToItsChallenges(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/exercises/pull-ups');

        self::assertSelectorTextSame('h1', 'Підтягування');
        self::assertContains('Техніка', self::texts($crawler, '.prose h2'));
        self::assertCount(12, $crawler->filter('.challenge-card'));
        self::assertSame(1, $crawler->filter('main a[href="/workout"]')->count());
    }

    public function testModeLeadsIntoTheGame(): void
    {
        $client = self::createClient();
        $ladder = $client->request('GET', '/modes/ladder');

        self::assertSame(1, $ladder->filter('.page-head a[href="/workout/setup/ladder"]')->count());
        self::assertCount(18, $ladder->filter('.challenge-card'));

        $random = $client->request('GET', '/modes/random-opponent');

        self::assertCount(0, $random->filter('.challenge-card'));
        self::assertSame(1, $random->filter('#challenges + p a[href="/challenges"]')->count());
    }

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
        self::assertSame('2026-11-03', $article['dateModified']);
        self::assertSame('http://localhost/guides/ladder-training', $article['mainEntityOfPage']);
    }

    public function testHubsListTheirPages(): void
    {
        $client = self::createClient();

        self::assertSame(
            ['/exercises/push-ups', '/exercises/squats', '/exercises/pull-ups'],
            self::links($client->request('GET', '/exercises')->filter('.cards')),
        );
        self::assertSame(
            ['/modes/target', '/modes/random-opponent', '/modes/opponent-levels', '/modes/ladder'],
            self::links($client->request('GET', '/modes')->filter('.cards')),
        );
        self::assertSame(
            ['/guides/ladder-training', '/guides/motivation'],
            self::links($client->request('GET', '/guides')->filter('.cards')),
        );
        $client->request('GET', '/about');
        self::assertSelectorTextSame('h1', 'Про проєкт');
    }

    public function testBreadcrumbsLeadBackToTheHub(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/exercises/squats');

        self::assertSame(['/', '/exercises'], self::links($crawler->filter('.breadcrumbs')));
        self::assertSame('Присідання', $crawler->filter('.breadcrumbs [aria-current="page"]')->text());
    }

    // Section 6.3: unknown addresses are a real 404, and an address never ends with a slash.
    public function testUnknownPagesAreNotFound(): void
    {
        $client = self::createClient();

        foreach (['/challenges/1000-push-ups', '/challenges/100-Push-Ups', '/exercises/burpees', '/modes/boxing', '/guides/unknown'] as $path) {
            $client->request('GET', $path);

            self::assertResponseStatusCodeSame(404, $path);
        }
        foreach (['/challenges/' => '/challenges', '/exercises/push-ups/' => '/exercises/push-ups'] as $path => $target) {
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
