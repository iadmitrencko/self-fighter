<?php

declare(strict_types=1);

namespace App\Tests\Site\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;

final class PagesTest extends WebTestCase
{
    // §3.1: everything the landing has to say about the game is in the HTML, so search engines see
    // it without scripts.
    public function testHomePageExplainsTheGame(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');
        $texts = static fn (string $selector): array => $crawler->filter($selector)->each(static fn (Crawler $node): string => $node->text());

        self::assertResponseIsSuccessful();
        self::assertSame('uk', $crawler->filter('html')->attr('lang'));
        self::assertCount(1, $crawler->filter('h1'));
        self::assertSelectorTextSame('h1', "Від джури до\u{A0}гетьмана\u{A0}— підхід за\u{A0}підходом.");
        self::assertSelectorTextContains('.logo', 'Self-Fighter');
        self::assertSame(['Бій', 'Похід «Січ»', 'Слава й звання', 'Енергія'], $texts('#game h3'));
        // §24.5: the three campaigns and the duel with the King of robbers.
        self::assertSame(['Чорний прапор', 'Степові вовки', 'Лісові круки', 'Фінальна битва'], $texts('.landing-campaign__name'));
        // §24.2: a look of the cossack for every group of ranks.
        self::assertSame(['Джура', 'Козак', 'Сотник', 'Генерал-осавул', 'Гетьман'], $texts('.landing-rank__name'));
        self::assertSame(['від 0 слави', 'від 45 слави', 'від 330 слави', 'від 1 150 слави', 'від 3 500 слави'], $texts('.landing-rank__glory'));
        self::assertCount(10, $crawler->filter('main svg[role="img"]'));
        // The pictures define gradients of their own, so no id repeats.
        $ids = $crawler->filter('[id]')->each(static fn (Crawler $node): string => (string) $node->attr('id'));
        self::assertSame(array_unique($ids), $ids);
        self::assertCount(3, $crawler->filter('.landing-step'));
        // §24.1: a workout starts with a fight of the game, and the journey is a step away.
        self::assertGreaterThanOrEqual(2, $crawler->filter('main a[href="/game/fight"]')->count());
        self::assertCount(1, $crawler->filter('main a[href="/game/journey"]'));
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

        self::assertPageTitleSame('Self-Fighter — козацька гра для тренувань з власною вагою');
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
        self::assertSame(1, $crawler->filter('link[rel="preload"][as="font"][crossorigin]')->count());
    }

    public function testFooterLeadsThroughTheSite(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        self::assertSame(
            ['/', '/game', '/about', '/game/fight', '/game/history', '/game/settings', '/privacy'],
            $crawler->filter('footer nav a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
        // §22: the decision changes as easily as it was made.
        self::assertSame('Згода на аналітику', $crawler->filter('footer button[data-consent-open]')->text());
    }

    // §22: every page asks the same way, and the browser decides whether to show the question.
    public function testEveryPageCarriesTheBannerOfConsent(): void
    {
        $client = self::createClient();
        $banners = [];

        foreach (['/', '/about', '/game', '/privacy'] as $page) {
            $crawler = $client->request('GET', $page);
            $banner = $crawler->filter('body > section#consent');
            $banners[] = $banner->outerHtml();

            self::assertSame('Згода на аналітику', $banner->attr('aria-label'), $page);
            self::assertNotNull($banner->attr('hidden'), $page);
            // Right after the skip link, so a screen reader meets the question before the page.
            self::assertSame('consent', $crawler->filter('body > .skip-link + *')->attr('id'), $page);
        }
        self::assertCount(1, array_unique($banners));
        $crawler = $client->request('GET', '/');
        self::assertSame(['/privacy'], $crawler->filter('#consent a')->each(static fn (Crawler $link): string => (string) $link->attr('href')));
        // Both answers look the same, so neither is pushed on the visitor.
        self::assertSame(
            [['granted', 'Дозволити', 'button button--outline'], ['denied', 'Відхилити', 'button button--outline']],
            $crawler->filter('#consent button')->each(static fn (Crawler $button): array => [
                (string) $button->attr('data-consent-choice'),
                $button->text(),
                (string) $button->attr('class'),
            ]),
        );
        self::assertStringContainsString('ідентифікатором твого користувача, гостя чи облікового запису', $crawler->filter('#consent')->text());
    }

    // A fight of the game opens inside the same header and footer as every page of the site.
    public function testGameLivesInTheFrameOfTheSite(): void
    {
        $client = self::createClient();
        $site = $client->request('GET', '/');
        $header = $site->filter('header')->html();
        $footer = $site->filter('footer')->html();
        $game = $client->request('GET', '/game/fight');

        self::assertSame($header, $game->filter('header')->html());
        self::assertSame($footer, $game->filter('footer')->html());
        self::assertSelectorExists('main #root');
        self::assertSame(
            // §24.1: everything is made for the game, so the header leads into it and to a fight in it.
            ['/game', '/game/fight'],
            $game->filter('header nav a')->each(static fn (Crawler $link): string => (string) $link->attr('href')),
        );
    }

    // §24: the cossack game has the frame of the site.
    public function testCossackGameLivesInTheFrameOfTheSite(): void
    {
        $client = self::createClient();
        $site = $client->request('GET', '/');
        $header = $site->filter('header')->html();
        $game = $client->request('GET', '/game');

        self::assertResponseIsSuccessful();
        self::assertSame($header, $game->filter('header')->html());
        self::assertSelectorExists('main #root');
        self::assertSelectorTextSame('title', 'Гра — Self-Fighter');
        self::assertSame('noindex, follow', $game->filter('meta[name="robots"]')->attr('content'));
        self::assertSame(
            ['exercises' => [['id' => 'push-ups', 'name' => 'Відтискання'], ['id' => 'squats', 'name' => 'Присідання'], ['id' => 'pull-ups', 'name' => 'Підтягування']], 'signIn' => ['google']],
            json_decode((string) $game->filter('#root')->attr('data-game'), true, 512, \JSON_THROW_ON_ERROR),
        );
    }

    // §24: Symfony knows every screen of the cossack game as well.
    public function testEveryScreenOfTheCossackGameHasItsAddress(): void
    {
        $client = self::createClient();
        $screens = [
            '/game',
            '/game/ranks',
            '/game/history',
            '/game/settings',
            '/game/fight',
            '/game/fight/battle',
            '/game/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85',
            '/game/journey',
            '/game/journey/forest-ravens',
            '/game/journey/black-flag',
            '/game/journey/steppe-wolves',
            '/game/journey/steppe-wolves/10/6',
            '/game/journey/forest-ravens/1',
            '/game/journey/forest-ravens/10/7',
            '/game/journey/battle',
            '/game/journey/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85',
        ];

        foreach ($screens as $screen) {
            $client->request('GET', $screen);

            self::assertResponseIsSuccessful($screen);
            self::assertSelectorExists('#root');
        }

        $unknown = [
            '/game/fight/result/42',
            '/game/journey/white-swans',
            '/game/journey/forest-ravens/0',
            '/game/journey/forest-ravens/1/first',
            '/game/journey/forest-ravens/1/1/1',
            '/game/unknown',
        ];

        foreach ($unknown as $address) {
            $client->request('GET', $address);

            self::assertResponseStatusCodeSame(404, $address);
        }

        // Section 6.3: an address with a trailing slash leads to the one without it.
        $client->request('GET', '/game/fight/');
        self::assertResponseRedirects('/game/fight', 301);
    }

    // §14.2: the score of the player lives in the game. The pages tell about it, so on every one of
    // them, the errors included, the content follows the header with nothing in between.
    public function testNoPageShowsTheScoreOfThePlayer(): void
    {
        $client = self::createClient(['debug' => false]);

        foreach (['/', '/about', '/privacy', '/game', '/missing'] as $page) {
            $crawler = $client->request('GET', $page);

            self::assertSame('main', $crawler->filter('body > header + *')->nodeName(), $page);
        }
    }

    // §24.1: the workouts of /workout are gone. Each of its screens leads to the same screen of the
    // fights of the game and keeps the query, such as how a sign-in with Google went.
    public function testTheScreensOfWorkoutLeadToTheGame(): void
    {
        $client = self::createClient();
        $moved = [
            '/workout' => '/game/fight',
            '/workout/setup/ladder' => '/game/fight',
            // §6: a fight has no modes any more, so their setup leads to the hall where a fight is put together.
            '/game/fight/setup/ladder' => '/game/fight',
            '/workout/fight' => '/game/fight',
            '/workout/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85' => '/game/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85',
            '/workout/history' => '/game/history',
            '/workout/history?sign-in=done' => '/game/history?sign-in=done',
            '/workout/account?sign-in=cancelled' => '/game/settings?sign-in=cancelled',
            '/workout/setup/target?sign-in=failed' => '/game/fight?sign-in=failed',
            // The query cannot change where the screen leads.
            '/workout/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85?id=42' => '/game/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85',
        ];

        foreach ($moved as $address => $screen) {
            $client->request('GET', $address);

            self::assertResponseRedirects($screen, 302, $address);
        }

        foreach (['/workout/setup/boxing', '/game/fight/setup/boxing', '/workout/result/42', '/workout/unknown'] as $address) {
            $client->request('GET', $address);

            self::assertResponseStatusCodeSame(404, $address);
        }
    }

    // §24.1: the ready-made challenges, the pages of the modes and of the exercises and the guides
    // (§21.2) are gone; their old addresses lead into the game.
    public function testRemovedSectionsLeadToTheGame(): void
    {
        $client = self::createClient();
        $addresses = [
            '/challenges',
            '/challenges/100-push-ups',
            '/workout/challenge/push-ups-ladder-to-10',
            '/modes',
            '/modes/ladder',
            '/exercises',
            '/exercises/squats',
            '/guides',
            '/guides/ladder-training',
        ];

        foreach ($addresses as $address) {
            $client->request('GET', $address);

            self::assertResponseRedirects('/game', 302, $address);
        }
    }

    // A page that sets no cookie stays the same for everyone and can be cached by a CDN.
    public function testPagesSetNoCookies(): void
    {
        $client = self::createClient();

        foreach (['/', '/game', '/missing'] as $page) {
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
        self::assertSame(['/', '/game/fight'], $crawler->filter('.error-page a')->each(
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
