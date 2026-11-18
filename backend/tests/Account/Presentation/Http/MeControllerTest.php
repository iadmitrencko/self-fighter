<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\ExerciseId;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\BrowserKit\Cookie;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\HttpFoundation\Cookie as ResponseCookie;

final class MeControllerTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // The tables of every module that keeps data of users.
    private const array TABLES = ['user', 'user_identity', 'device', 'attempt', 'custom_exercise', 'workout_settings'];

    public function testVisitorWithoutCookieHasNoUserAndLeavesNothingBehind(): void
    {
        $this->send('GET', '/api/v1/me');

        self::assertResponseIsSuccessful();
        self::assertSame('{"user":null}', $this->browser->getResponse()->getContent());
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        self::assertSame(0, $this->rowCount('user'));
    }

    // §23.1: the game needs an account, so a write of a browser that has not signed in creates nobody.
    public function testWriteWithoutAccountCreatesNobody(): void
    {
        $this->send('PUT', '/api/v1/settings/fight', Documents::fightConfig());

        $this->assertError(401, 'unauthorized');
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        self::assertSame(0, $this->rowCount('user'));
    }

    public function testSigningInGivesTheCookieThatFindsTheAccount(): void
    {
        self::mockTime('2026-11-02 10:00:00.123');

        $this->signInWithGoogle();

        $cookie = $this->issuedDeviceCookie();
        self::assertTrue($cookie->isSecure());
        self::assertTrue($cookie->isHttpOnly());
        self::assertSame(ResponseCookie::SAMESITE_LAX, $cookie->getSameSite());
        self::assertSame('/', $cookie->getPath());
        self::assertNull($cookie->getDomain());
        self::assertSame(strtotime('2027-12-07 10:00:00 UTC'), $cookie->getExpiresTime());

        // Only the hash reaches the database, so a copy of it signs nobody in.
        self::assertSame(
            [hash('sha256', (string) $cookie->getValue())],
            $this->database()->fetchFirstColumn('SELECT token_hash FROM device'),
        );

        $this->send('GET', '/api/v1/me');
        $user = $this->responseData()['user'];
        self::assertIsArray($user);
        self::assertNotNull(UserId::tryFrom((string) $user['id']));
        self::assertSame(
            ['createdAt' => '2026-11-02T10:00:00.000Z', 'nickname' => null, 'name' => 'Олена Коваль', 'email' => 'olena@example.com'],
            array_diff_key($user, ['id' => true]),
        );
    }

    public function testUnknownCookieIsRemovedFromTheBrowser(): void
    {
        $this->browser->getCookieJar()->set(new Cookie(self::DEVICE_COOKIE, str_repeat('a', 43), null, '/', 'localhost', true));

        $this->send('GET', '/api/v1/me');

        self::assertResponseIsSuccessful();
        self::assertSame(['user' => null], $this->responseData());
        self::assertTrue($this->issuedDeviceCookie()->isCleared());
    }

    // §24.11: the player names the cossack; the name is cleaned, and null takes it away.
    public function testPlayerNamesTheCossack(): void
    {
        $this->signUp();

        $this->send('PATCH', '/api/v1/me', ['nickname' => "  Іван \n Сірко "]);

        self::assertResponseIsSuccessful();
        self::assertSame('Іван Сірко', $this->nickname());
        $this->send('GET', '/api/v1/me');
        self::assertSame('Іван Сірко', $this->nickname());

        $this->send('PATCH', '/api/v1/me', ['nickname' => null]);

        self::assertResponseIsSuccessful();
        self::assertNull($this->nickname());
    }

    #[DataProvider('noNames')]
    public function testRefusesWhatIsNoName(mixed $body): void
    {
        $this->signUp();

        $this->send('PATCH', '/api/v1/me', $body);

        $this->assertError(422, 'invalid-name');
    }

    /**
     * @return iterable<string, array{mixed}>
     */
    public static function noNames(): iterable
    {
        yield 'too long' => [['nickname' => str_repeat('я', 41)]];
        yield 'a number' => [['nickname' => 7]];
        yield 'no name' => [['name' => 'Іван']];
        yield 'one more field' => [['nickname' => 'Іван', 'name' => 'Іван']];
        yield 'a list' => [['Іван']];
    }

    public function testNamingTheCossackNeedsUser(): void
    {
        $this->send('PATCH', '/api/v1/me', ['nickname' => 'Іван']);

        $this->assertError(401, 'unauthorized');
        self::assertSame(0, $this->rowCount('user'));
    }

    public function testDataNeedsUser(): void
    {
        $this->send('GET', '/api/v1/attempts');

        $this->assertError(401, 'unauthorized');
    }

    public function testCookieIsRenewedAtMostOnceADay(): void
    {
        self::mockTime('2026-11-02 10:00:00');
        $this->signUp();

        self::mockTime('2026-11-03 09:59:59');
        $this->send('GET', '/api/v1/me');

        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);

        self::mockTime('2026-11-03 10:00:00');
        $this->send('GET', '/api/v1/me');

        self::assertSame(strtotime('2027-12-08 10:00:00 UTC'), $this->issuedDeviceCookie()->getExpiresTime());
        self::assertSame('2026-11-03 10:00:00', $this->database()->fetchOne('SELECT last_seen_at FROM device'));
    }

    // §15.5: the data of every module goes with the user, and the data of others stays.
    public function testDeletingDataRemovesEverythingOfThisUserOnly(): void
    {
        // The server takes a battle of the last days only (§24.4).
        self::mockTime('2026-11-02 12:00:00');
        $this->signUp();
        $this->send('PUT', '/api/v1/exercises/'.ExerciseId::generate(), ['name' => 'Бурпі', 'description' => '']);
        $this->send('PUT', '/api/v1/settings/fight', Documents::fightConfig());
        $attempt = Documents::level();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $mine = $this->deviceCookie();

        $this->switchBrowser();
        $this->signUp();
        $this->send('PUT', '/api/v1/settings/fight', Documents::fightConfig());
        $foreign = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$foreign['id'], $foreign);

        $this->switchBrowser($mine);
        $this->send('DELETE', '/api/v1/me');

        self::assertResponseStatusCodeSame(204);
        self::assertTrue($this->issuedDeviceCookie()->isCleared());
        self::assertSame(
            ['user' => 1, 'user_identity' => 1, 'device' => 1, 'attempt' => 1, 'custom_exercise' => 0, 'workout_settings' => 1],
            array_map($this->rowCount(...), array_combine(self::TABLES, self::TABLES)),
        );

        $this->switchBrowser($mine);
        $this->send('GET', '/api/v1/me');

        self::assertSame(['user' => null], $this->responseData());
    }

    public function testDeletingTwiceFindsNobodyTheSecondTime(): void
    {
        $this->signUp();
        $mine = $this->deviceCookie();
        $this->send('DELETE', '/api/v1/me');

        $this->switchBrowser($mine);
        $this->send('DELETE', '/api/v1/me');

        $this->assertError(401, 'unauthorized');
    }

    private function issuedDeviceCookie(): ResponseCookie
    {
        foreach ($this->browser->getResponse()->headers->getCookies() as $cookie) {
            if (self::DEVICE_COOKIE === $cookie->getName()) {
                return $cookie;
            }
        }

        self::fail('The response does not set the device cookie.');
    }

    /**
     * The name of the cossack in the last answer about the user of the browser.
     *
     * @phpstan-impure
     */
    private function nickname(): ?string
    {
        $user = $this->responseData()['user'] ?? null;
        self::assertIsArray($user);
        self::assertArrayHasKey('nickname', $user);
        $nickname = $user['nickname'];
        self::assertTrue(null === $nickname || \is_string($nickname));

        return $nickname;
    }
}
