<?php

declare(strict_types=1);

namespace App\Tests\Site\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

final class PagesTest extends WebTestCase
{
    // §3.1: everything the landing has to say is in the HTML, so search engines see it without scripts.
    public function testHomePageExplainsTheGame(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSame('uk', $crawler->filter('html')->attr('lang'));
        self::assertCount(1, $crawler->filter('h1'));
        self::assertSelectorTextSame('h1', "Перетвори тренування на\u{A0}гру.");
        self::assertSelectorTextContains('.logo', 'Self-Fighter');
        self::assertSame(
            ['Ціль', 'Випадковий суперник', 'Рівні суперників', 'Драбина'],
            $crawler->filter('#modes h3')->each(static fn (Crawler $title): string => $title->text()),
        );
        self::assertCount(3, $crawler->filter('#how li'));
        self::assertCount(4, $crawler->filter('.benefit'));
        self::assertGreaterThanOrEqual(2, $crawler->filter('main a[href="/workout"]')->count());
        self::assertSame(
            ['/modes/target', '/modes/random-opponent', '/modes/opponent-levels', '/modes/ladder', '/challenges'],
            $crawler->filter('#modes a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
    }

    // Section 6.3 of the plan: search engines learn the name of the site and how people say it.
    public function testHomePageNamesTheSiteForSearchEngines(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');
        $data = json_decode($crawler->filter('script[type="application/ld+json"]')->text(), true, 512, \JSON_THROW_ON_ERROR);

        self::assertSame('http://localhost/', $crawler->filter('link[rel="canonical"]')->attr('href'));
        self::assertSame(['WebSite', 'Organization'], array_column($data, '@type'));
        self::assertSame(['Селф Файтер', 'Селф Файтер'], array_column($data, 'alternateName'));
        self::assertSame('http://localhost/apple-touch-icon.png', $data[1]['logo']);
    }

    public function testHomePageHasItsOwnTitleAndDescription(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        self::assertPageTitleSame('Self-Fighter — тренування у форматі гри');
        $description = (string) $crawler->filter('meta[name="description"]')->attr('content');
        self::assertNotSame('', $description);
        self::assertLessThanOrEqual(155, mb_strlen($description));
        self::assertCount(0, $crawler->filter('meta[name="robots"]'));
    }

    // Section 6.4 of the plan: no React and nothing from other sites on public pages.
    public function testPublicPagesLoadNeitherTheGameNorOtherSites(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        foreach ($crawler->filter('script[src]') as $script) {
            self::assertInstanceOf(\DOMElement::class, $script);
            self::assertDoesNotMatchRegularExpression('~/(src/app/|assets/app-)~', $script->getAttribute('src'));
        }
        self::assertStringNotContainsString('fonts.googleapis.com', (string) $client->getResponse()->getContent());
        self::assertSame(2, $crawler->filter('link[rel="preload"][as="font"][crossorigin]')->count());
    }

    public function testFooterLeadsThroughTheSite(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        self::assertSame(
            ['/', '/challenges', '/modes', '/exercises', '/guides', '/about', '/workout', '/workout/history', '/workout/account'],
            $crawler->filter('footer nav a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
    }

    // The game opens inside the same header and footer as every page of the site.
    public function testGameLivesInTheFrameOfTheSite(): void
    {
        $client = self::createClient();
        $site = $client->request('GET', '/');
        $header = $site->filter('header')->html();
        $footer = $site->filter('footer')->html();
        $game = $client->request('GET', '/workout/history');

        self::assertSame($header, $game->filter('header')->html());
        self::assertSame($footer, $game->filter('footer')->html());
        self::assertSelectorExists('main #root');
        self::assertSame(
            ['/challenges', '/modes', '/exercises', '/workout/history', '/workout/account', '/workout'],
            $game->filter('header nav a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
    }

    // §14.2: the score of the player stands on every page; the browser fills in its numbers.
    public function testEveryPageShowsTheScoreOfThePlayer(): void
    {
        $client = self::createClient();
        $scores = [];

        foreach (['/', '/challenges', '/workout', '/workout/history'] as $page) {
            $crawler = $client->request('GET', $page);
            $scores[] = $crawler->filter('.score')->outerHtml();

            self::assertSame(
                ['total', 'wins', 'draws', 'losses', 'challenges'],
                $crawler->filter('.score [data-score]')->each(static fn (Crawler $value): string => (string) $value->attr('data-score')),
                $page,
            );
            self::assertSame(['Тренування', 'Перемоги', 'Нічиї', 'Поразки', 'Виклики'], $crawler->filter('.score dt')->each(
                static fn (Crawler $label): string => $label->text(),
            ));
        }
        // The same HTML for everyone: the page reads no cookie and stays cacheable.
        self::assertCount(1, array_unique($scores));
    }

    public function testWorkoutShellIsNotIndexed(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/workout');

        self::assertResponseIsSuccessful();
        self::assertSelectorExists('#root');
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
    }

    // Section 3.4: Symfony knows every screen of the game, so a reload opens it and anything else is a 404.
    public function testEveryScreenOfTheGameHasItsAddress(): void
    {
        $client = self::createClient();
        $screens = [
            '/workout/setup/target',
            '/workout/setup/random-opponent',
            '/workout/setup/opponent-levels',
            '/workout/setup/ladder',
            '/workout/fight',
            '/workout/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85',
            '/workout/history',
            '/workout/account',
            '/workout/challenge/100-push-ups',
        ];

        foreach ($screens as $screen) {
            $client->request('GET', $screen);

            self::assertResponseIsSuccessful($screen);
            self::assertSelectorExists('#root');
        }

        foreach (['/workout/setup/boxing', '/workout/result/42', '/workout/unknown', '/workout/challenge/1000-push-ups'] as $address) {
            $client->request('GET', $address);

            self::assertResponseStatusCodeSame(404, $address);
        }

        // Section 6.3: an address with a trailing slash leads to the one without it.
        $client->request('GET', '/workout/');
        self::assertResponseRedirects('/workout', 301);
    }

    // §5.1: the game gets the ready-made exercises with the page, before its first request.
    public function testShellCarriesTheReadyMadeExercises(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/workout');

        self::assertSame(
            ['exercises' => [
                ['id' => 'push-ups', 'name' => 'Віджимання'],
                ['id' => 'squats', 'name' => 'Присідання'],
                ['id' => 'pull-ups', 'name' => 'Підтягування'],
            ]],
            json_decode((string) $crawler->filter('#root')->attr('data-game'), true, 512, \JSON_THROW_ON_ERROR),
        );
    }

    // §21.3: the game opens a ready-made challenge with its configuration and lets the player change it.
    public function testShellCarriesTheOpenedChallenge(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/workout/challenge/push-ups-ladder-to-10');
        $game = json_decode((string) $crawler->filter('#root')->attr('data-game'), true, 512, \JSON_THROW_ON_ERROR);

        self::assertSame(['push-ups', 'squats', 'pull-ups'], array_column($game['exercises'], 'id'));
        // MySQL keeps the keys of a JSON object in its own order.
        self::assertEquals([
            'slug' => 'push-ups-ladder-to-10',
            'title' => 'Драбина віджимань до 10',
            'config' => [
                'mode' => 'ladder',
                'rule' => 'meet',
                'exercise' => ['id' => 'push-ups', 'name' => 'Віджимання'],
                'max' => 10,
                'returnDown' => false,
            ],
        ], $game['challenge']);
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
    }

    // A page that sets no cookie stays the same for everyone and can be cached by a CDN.
    public function testPagesSetNoCookies(): void
    {
        $client = self::createClient();

        foreach (['/', '/workout', '/missing'] as $page) {
            $client->request('GET', $page);

            self::assertSame([], $client->getResponse()->headers->getCookies(), $page);
        }
    }

    // Visitors see the error pages only when debugging is off, as in production.
    public function testUnknownPageExplainsWhereToGo(): void
    {
        $client = self::createClient(['debug' => false]);
        $crawler = $client->request('GET', '/missing');

        self::assertResponseStatusCodeSame(404);
        self::assertSelectorTextSame('h1', 'Сторінку не знайдено');
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
        self::assertSame(['/', '/workout'], $crawler->filter('.error-page a')->each(
            static fn (Crawler $link): string => (string) $link->attr('href'),
        ));
    }

    public function testOtherErrorsShowNoDetails(): void
    {
        $client = self::createClient(['debug' => false]);
        $crawler = $client->request('POST', '/');

        self::assertResponseStatusCodeSame(405);
        self::assertSelectorTextSame('h1', 'Щось пішло не так');
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
        self::assertStringNotContainsString('MethodNotAllowed', (string) $client->getResponse()->getContent());
    }
}
