<?php

declare(strict_types=1);

namespace App\Tests\Account;

use Symfony\Component\Clock\Clock;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * The token endpoint of Google for the tests, which never call the real one (section 8 of the
 * plan). The kernel boots anew for every request of a test, so the next answer is static.
 */
final class FakeGoogle
{
    // The client phpunit.dist.xml configures.
    public const string CLIENT_ID = 'test-client';
    public const string CLIENT_SECRET = 'test-secret';

    /**
     * @var array<string, mixed>
     */
    private static array $claims = [];
    private static int $status = 200;

    /**
     * @var list<array{url: string, body: array<mixed>}>
     */
    private static array $requests = [];

    public static function reset(): void
    {
        self::$claims = [];
        self::$status = 200;
        self::$requests = [];
    }

    /**
     * The person the next exchange of a code names. Claims left out take the values of a usual account.
     *
     * @param array<string, mixed> $claims
     */
    public static function willIdentify(array $claims): void
    {
        self::$claims = $claims;
        self::$status = 200;
    }

    public static function willRefuse(int $status): void
    {
        self::$status = $status;
    }

    /**
     * @return list<array{url: string, body: array<mixed>}>
     */
    public static function requests(): array
    {
        return self::$requests;
    }

    /**
     * @param array<string, mixed> $options
     */
    public function __invoke(string $method, string $url, array $options): ResponseInterface
    {
        parse_str(\is_string($options['body'] ?? null) ? $options['body'] : '', $body);
        self::$requests[] = ['url' => $url, 'body' => $body];

        if (200 !== self::$status) {
            return new MockResponse('{"error":"invalid_grant"}', [
                'http_code' => self::$status,
                'response_headers' => ['Content-Type: application/json'],
            ]);
        }

        return new MockResponse(json_encode([
            'access_token' => 'ya29.fake',
            'expires_in' => 3599,
            'scope' => 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            'token_type' => 'Bearer',
            'id_token' => self::idToken(self::$claims),
        ], \JSON_THROW_ON_ERROR), ['response_headers' => ['Content-Type: application/json']]);
    }

    /**
     * An ID token as Google signs it. Nobody checks the signature: the token comes from the token
     * endpoint itself.
     *
     * @param array<string, mixed> $claims
     */
    public static function idToken(array $claims): string
    {
        $now = Clock::get()->now()->getTimestamp();
        $claims = [
            'iss' => 'https://accounts.google.com',
            'azp' => self::CLIENT_ID,
            'aud' => self::CLIENT_ID,
            'sub' => '110248495921238986420',
            'email' => 'olena@example.com',
            'email_verified' => true,
            'name' => 'Олена Коваль',
            'iat' => $now,
            'exp' => $now + 3600,
            ...$claims,
        ];

        return self::part(['alg' => 'RS256', 'kid' => 'fake', 'typ' => 'JWT']).'.'.self::part($claims).'.c2lnbmF0dXJl';
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function part(array $data): string
    {
        return rtrim(strtr(base64_encode(json_encode($data, \JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }
}
