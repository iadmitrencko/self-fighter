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
            ['/', '/#modes', '/#how', '/workout'],
            $crawler->filter('footer nav a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
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
        ];

        foreach ($screens as $screen) {
            $client->request('GET', $screen);

            self::assertResponseIsSuccessful($screen);
            self::assertSelectorExists('#root');
        }

        foreach (['/workout/setup/boxing', '/workout/result/42', '/workout/unknown'] as $address) {
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
        self::assertSame('noindex', $crawler->filter('meta[name="robots"]')->attr('content'));
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
        self::assertSame('noindex', $crawler->filter('meta[name="robots"]')->attr('content'));
        self::assertStringNotContainsString('MethodNotAllowed', (string) $client->getResponse()->getContent());
    }
}
