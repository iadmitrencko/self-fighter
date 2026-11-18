<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * An account on its browsers: signing out and deleting it (§15.5, §23).
 */
final class AccountTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // §23.2: signing out forgets the browser; the data waits for the next sign-in on any browser.
    public function testSigningOutForgetsTheBrowser(): void
    {
        $attempt = $this->accountWithAttempt();
        $accountCookie = $this->deviceCookie();

        $this->send('POST', '/api/v1/me/logout');

        self::assertResponseIsSuccessful();
        self::assertSame(['user' => null], $this->responseData());
        self::assertTrue($this->issuedCookie()->isCleared());
        self::assertSame(0, $this->rowCount('device'));
        $this->send('GET', '/api/v1/attempts');
        $this->assertError(401, 'unauthorized');

        // The old token led to the account and leads nowhere now.
        $this->switchBrowser($accountCookie);
        $this->send('GET', '/api/v1/me');
        self::assertSame(['user' => null], $this->responseData());

        $this->switchBrowser();
        $this->signInWithGoogle(['sub' => '1001']);
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$attempt], $this->attemptIds());
    }

    // §15.5: deleting the account takes its data, its way to sign in and every browser it is open in.
    public function testDeletingTheAccountSignsOutEveryBrowser(): void
    {
        $this->accountWithAttempt();
        $thisBrowser = $this->deviceCookie();
        $this->switchBrowser();
        $this->signInWithGoogle(['sub' => '1001']);
        $otherBrowser = $this->deviceCookie();

        $this->switchBrowser($thisBrowser);
        $this->send('DELETE', '/api/v1/me');

        self::assertResponseStatusCodeSame(204);
        self::assertTrue($this->issuedCookie()->isCleared());
        self::assertSame(
            ['user' => 0, 'user_identity' => 0, 'device' => 0, 'attempt' => 0],
            array_map($this->rowCount(...), ['user' => 'user', 'user_identity' => 'user_identity', 'device' => 'device', 'attempt' => 'attempt']),
        );

        $this->switchBrowser($otherBrowser);
        $this->send('GET', '/api/v1/me');
        self::assertSame(['user' => null], $this->responseData());
    }

    // An account with a battle of the day before, open on this browser. Returns the id of the battle.
    private function accountWithAttempt(): string
    {
        // The server takes a battle of the last days only (§24.4).
        self::mockTime('2026-11-04 10:00:00');
        $this->signInWithGoogle(['sub' => '1001']);
        $attempt = Documents::fight('win', '2026-11-03T10:00:00.000Z', overrides: ['startedAt' => '2026-11-03T09:40:00.000Z']);
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        self::assertResponseIsSuccessful();
        self::assertIsString($attempt['id']);

        return $attempt['id'];
    }

    /**
     * @return list<mixed> the ids of the listed attempts, the newest first
     */
    private function attemptIds(): array
    {
        $items = $this->responseData()['items'] ?? null;
        self::assertIsArray($items);

        return array_values(array_map(static fn (mixed $item): mixed => \is_array($item) ? ($item['id'] ?? null) : null, $items));
    }

    private function issuedCookie(): Cookie
    {
        foreach ($this->browser->getResponse()->headers->getCookies() as $cookie) {
            if (self::DEVICE_COOKIE === $cookie->getName()) {
                return $cookie;
            }
        }

        self::fail('The response does not set the device cookie.');
    }
}
