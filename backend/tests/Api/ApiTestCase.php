<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\BrowserKit\Cookie;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

abstract class ApiTestCase extends WebTestCase
{
    protected const string DEVICE_COOKIE = '__Host-sf_device';

    protected KernelBrowser $browser;

    // Rate limits count requests per address, so every test comes from its own one.
    protected string $address;

    protected function setUp(): void
    {
        $this->address = \sprintf('10.%d.%d.%d', random_int(0, 255), random_int(0, 255), random_int(1, 254));
        // The device cookie is secure, so the browser talks to the site over HTTPS as in production.
        $this->browser = self::createClient([], [
            'HTTPS' => 'on',
            'HTTP_ORIGIN' => 'https://localhost',
            'REMOTE_ADDR' => $this->address,
        ]);
    }

    protected function send(string $method, string $uri, mixed $body = null): Response
    {
        $this->browser->request(
            $method,
            $uri,
            server: ['CONTENT_TYPE' => 'application/json'],
            content: null === $body ? null : json_encode($body, \JSON_THROW_ON_ERROR),
        );

        return $this->browser->getResponse();
    }

    /**
     * @return array<mixed>
     */
    protected function responseData(): array
    {
        $data = json_decode((string) $this->browser->getResponse()->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        self::assertIsArray($data);

        return $data;
    }

    protected function assertError(int $status, string $error): void
    {
        self::assertResponseStatusCodeSame($status);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        self::assertSame(['error' => $error], $this->responseData());
    }

    // Creates the guest of this browser and returns its id.
    protected function signUp(): string
    {
        $this->send('POST', '/api/v1/me');
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $user = $this->responseData()['user'];
        self::assertIsArray($user);
        self::assertIsString($user['id']);

        return $user['id'];
    }

    protected function deviceCookie(): Cookie
    {
        $cookie = $this->browser->getCookieJar()->get(self::DEVICE_COOKIE, '/', 'localhost');
        self::assertNotNull($cookie);

        return $cookie;
    }

    // Continues as another browser: a new one, or the one that holds the given device cookie.
    protected function switchBrowser(?Cookie $deviceCookie = null): void
    {
        $this->browser->getCookieJar()->clear();

        if (null !== $deviceCookie) {
            $this->browser->getCookieJar()->set($deviceCookie);
        }
    }

    protected function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }

    protected function rowCount(string $table): int
    {
        return (int) $this->database()->fetchOne(\sprintf('SELECT COUNT(*) FROM %s', $table));
    }

    // Spends the whole limit at once instead of sending hundreds of requests.
    protected function exhaustLimit(string $limiter, string $key): void
    {
        $factory = self::getContainer()->get('limiter.'.$limiter);
        self::assertInstanceOf(RateLimiterFactoryInterface::class, $factory);

        while ($factory->create($key)->consume()->isAccepted()) {
        }
    }
}
