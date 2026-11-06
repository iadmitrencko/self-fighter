<?php

declare(strict_types=1);

namespace App\Tests\Account\Infrastructure\Google;

use App\Account\Application\ExternalIdentity;
use App\Account\Application\SignInFailed;
use App\Account\Infrastructure\Google\GoogleOAuth;
use App\Tests\Account\FakeGoogle;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class GoogleOAuthTest extends TestCase
{
    private const string NOW = '2026-11-04 10:00:00';

    // Without a client of Google Cloud the game hides its sign-in button.
    public function testNeedsBothHalvesOfTheClient(): void
    {
        self::assertTrue($this->google('id', 'secret')->isConfigured());
        self::assertFalse($this->google('id', '')->isConfigured());
        self::assertFalse($this->google('', 'secret')->isConfigured());
    }

    // OpenID Connect allows the audience as a list as well.
    public function testAcceptsTheClientInAListOfAudiences(): void
    {
        $identity = $this->identify(['aud' => ['another-client', FakeGoogle::CLIENT_ID], 'sub' => '42']);

        self::assertSame('42', $identity->subject);
    }

    public function testToleratesClocksThatDifferALittle(): void
    {
        $now = (new \DateTimeImmutable(self::NOW))->getTimestamp();

        self::assertSame('1', $this->identify(['sub' => '1', 'exp' => $now - 299])->subject);

        $this->expectException(SignInFailed::class);
        $this->identify(['exp' => $now - 301]);
    }

    public function testRefusesAnAnswerWithoutAnIdToken(): void
    {
        $google = $this->google(FakeGoogle::CLIENT_ID, FakeGoogle::CLIENT_SECRET, new MockResponse('{"access_token":"ya29"}'));

        $this->expectException(SignInFailed::class);
        $google->identify('https://localhost/connect/google/check', 'code', 'verifier');
    }

    public function testRefusesAMalformedIdToken(): void
    {
        $google = $this->google(FakeGoogle::CLIENT_ID, FakeGoogle::CLIENT_SECRET, new MockResponse('{"id_token":"a.!!!.c"}'));

        $this->expectException(SignInFailed::class);
        $google->identify('https://localhost/connect/google/check', 'code', 'verifier');
    }

    public function testCountsAHangingGoogleAsAFailure(): void
    {
        $google = $this->google(FakeGoogle::CLIENT_ID, FakeGoogle::CLIENT_SECRET, new MockResponse('', ['error' => 'timeout']));

        $this->expectException(SignInFailed::class);
        $google->identify('https://localhost/connect/google/check', 'code', 'verifier');
    }

    /**
     * @param array<string, mixed> $claims
     */
    private function identify(array $claims): ExternalIdentity
    {
        // The fake dates its tokens by the clock of the tests.
        Clock::set(new MockClock(self::NOW));

        try {
            $token = FakeGoogle::idToken($claims);
        } finally {
            Clock::set(new NativeClock());
        }

        return $this->google(FakeGoogle::CLIENT_ID, FakeGoogle::CLIENT_SECRET, new MockResponse(json_encode(['id_token' => $token], \JSON_THROW_ON_ERROR)))
            ->identify('https://localhost/connect/google/check', 'code', 'verifier');
    }

    private function google(string $clientId, string $clientSecret, ?MockResponse $answer = null): GoogleOAuth
    {
        return new GoogleOAuth(
            new MockHttpClient($answer ?? new MockResponse('{}')),
            new MockClock(self::NOW),
            $clientId,
            $clientSecret,
            'https://accounts.google.com/o/oauth2/v2/auth',
            'https://oauth2.googleapis.com/token',
        );
    }
}
