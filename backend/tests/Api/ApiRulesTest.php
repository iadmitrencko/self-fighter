<?php

declare(strict_types=1);

namespace App\Tests\Api;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Uid\Uuid;

final class ApiRulesTest extends ApiTestCase
{
    #[DataProvider('foreignOrigins')]
    public function testWritesFromOtherSitesAreRefused(?string $origin): void
    {
        $this->browser->request('POST', '/api/v1/me', server: ['HTTP_ORIGIN' => $origin]);

        $this->assertError(403, 'cross-origin');
        self::assertSame(0, $this->rowCount('user'));
    }

    /**
     * @return iterable<string, array{?string}>
     */
    public static function foreignOrigins(): iterable
    {
        yield 'another site' => ['https://evil.example'];
        yield 'same host over plain HTTP' => ['http://localhost'];
        yield 'no origin' => [null];
    }

    public function testWritesMustBeJson(): void
    {
        $this->signUp();

        $this->browser->request('PUT', '/api/v1/exercises/'.Uuid::v7(), server: ['CONTENT_TYPE' => 'text/plain'], content: 'name=Бурпі');

        $this->assertError(415, 'json-required');
    }

    public function testMalformedJsonIsRefused(): void
    {
        $this->signUp();

        $this->browser->request('PUT', '/api/v1/exercises/'.Uuid::v7(), server: ['CONTENT_TYPE' => 'application/json'], content: '{"name":');

        $this->assertError(400, 'invalid-json');
    }

    public function testOversizedBodyIsRefused(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => 'Бурпі', 'description' => str_repeat('ж', 5000)]);

        $this->assertError(413, 'too-large');
    }

    public function testUnknownAddressAnswersInJson(): void
    {
        $this->send('GET', '/api/v1/nothing');

        $this->assertError(404, 'not-found');
    }

    // Answers carry personal data, so neither the browser nor a proxy may store them.
    public function testAnswersAreNotStored(): void
    {
        $this->send('GET', '/api/v1/me');

        self::assertResponseHeaderSame('Cache-Control', 'no-store, private');
    }
}
