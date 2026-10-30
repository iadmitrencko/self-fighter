<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class PagesTest extends WebTestCase
{
    public function testHomePageIsRenderedByTheServer(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Перетвори тренування на гру.');
        self::assertSame('uk', $crawler->filter('html')->attr('lang'));
    }

    public function testWorkoutShellIsNotIndexed(): void
    {
        $client = self::createClient();
        $crawler = $client->request('GET', '/workout');

        self::assertResponseIsSuccessful();
        self::assertSelectorExists('#root');
        self::assertSame('noindex, follow', $crawler->filter('meta[name="robots"]')->attr('content'));
    }

    public function testUnknownPageReturnsNotFound(): void
    {
        $client = self::createClient();
        $client->request('GET', '/workout/unknown');

        self::assertResponseStatusCodeSame(404);
    }
}
