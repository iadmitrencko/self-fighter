<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\ExerciseId;
use Symfony\Component\BrowserKit\Cookie;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\HttpFoundation\Cookie as ResponseCookie;

final class MeControllerTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // The tables of every module that keeps data of users.
    private const array TABLES = ['user', 'device', 'attempt', 'custom_exercise', 'workout_settings'];

    public function testVisitorWithoutCookieHasNoUserAndLeavesNothingBehind(): void
    {
        $this->send('GET', '/api/v1/me');

        self::assertResponseIsSuccessful();
        self::assertSame('{"user":null}', $this->browser->getResponse()->getContent());
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        self::assertSame(0, $this->rowCount('user'));
    }

    public function testFirstWriteCreatesGuestFoundByDeviceCookie(): void
    {
        self::mockTime('2026-11-02 10:00:00.123');

        $this->send('POST', '/api/v1/me');

        self::assertResponseStatusCodeSame(201);
        $user = $this->responseData()['user'];
        self::assertIsArray($user);
        self::assertNotNull(UserId::tryFrom((string) $user['id']));
        self::assertSame(['kind' => 'guest', 'createdAt' => '2026-11-02T10:00:00.000Z'], ['kind' => $user['kind'], 'createdAt' => $user['createdAt']]);

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
    }

    public function testRepeatedRequestKeepsTheSameGuest(): void
    {
        $userId = $this->signUp();

        $this->send('POST', '/api/v1/me');

        self::assertResponseStatusCodeSame(200);
        $user = $this->responseData()['user'];
        self::assertIsArray($user);
        self::assertSame($userId, $user['id']);
        self::assertSame(1, $this->rowCount('user'));
    }

    public function testUnknownCookieIsRemovedFromTheBrowser(): void
    {
        $this->browser->getCookieJar()->set(new Cookie(self::DEVICE_COOKIE, str_repeat('a', 43), null, '/', 'localhost', true));

        $this->send('GET', '/api/v1/me');

        self::assertResponseIsSuccessful();
        self::assertSame(['user' => null], $this->responseData());
        self::assertTrue($this->issuedDeviceCookie()->isCleared());
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

    public function testGuestsAreCreatedAtLimitedPacePerAddress(): void
    {
        $this->exhaustLimit('guest_creation', $this->address);

        $this->send('POST', '/api/v1/me');

        $this->assertError(429, 'rate-limited');
        self::assertResponseHasHeader('Retry-After');
        self::assertSame(0, $this->rowCount('user'));
    }

    // §15.5: the data of every module goes with the user, and the data of others stays.
    public function testDeletingDataRemovesEverythingOfThisUserOnly(): void
    {
        $this->signUp();
        $this->send('PUT', '/api/v1/exercises/'.ExerciseId::generate(), ['name' => 'Бурпі', 'description' => '']);
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());
        $attempt = Documents::ladder();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $mine = $this->deviceCookie();

        $this->switchBrowser();
        $this->signUp();
        $this->send('PUT', '/api/v1/settings/target', Documents::targetConfig());
        $foreign = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$foreign['id'], $foreign);

        $this->switchBrowser($mine);
        $this->send('DELETE', '/api/v1/me');

        self::assertResponseStatusCodeSame(204);
        self::assertTrue($this->issuedDeviceCookie()->isCleared());
        self::assertSame(
            ['user' => 1, 'device' => 1, 'attempt' => 1, 'custom_exercise' => 0, 'workout_settings' => 1],
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

    public function testExportContainsEverythingOfThisUserOnly(): void
    {
        self::mockTime('2026-11-02 12:00:00');
        $this->signUp();
        $this->send('PUT', '/api/v1/exercises/'.ExerciseId::generate(), ['name' => 'Віджимання', 'description' => '']);
        $this->send('PUT', '/api/v1/settings/target', Documents::targetConfig());
        $foreign = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$foreign['id'], $foreign);
        $this->send('POST', '/api/v1/events', ['name' => 'workout_started', 'mode' => 'target']);

        $this->switchBrowser();
        $userId = $this->signUp();
        $exerciseId = ExerciseId::generate()->value;
        $this->send('PUT', '/api/v1/exercises/'.$exerciseId, ['name' => 'Бурпі', 'description' => 'Зі стрибком']);
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());
        $later = Documents::fight('loss', '2026-11-02T11:00:00.000Z');
        $earlier = Documents::ladder('win', '2026-11-02T09:00:00.000Z');
        $this->send('PUT', '/api/v1/attempts/'.$later['id'], $later);
        $this->send('PUT', '/api/v1/attempts/'.$earlier['id'], $earlier);
        $this->send('POST', '/api/v1/events', ['name' => 'workout_completed', 'mode' => 'ladder', 'outcome' => 'win']);

        $this->send('GET', '/api/v1/me/export');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Disposition', 'attachment; filename=self-fighter-data.json');
        self::assertEquals([
            'exportedAt' => '2026-11-02T12:00:00.000Z',
            'user' => ['id' => $userId, 'kind' => 'guest', 'createdAt' => '2026-11-02T12:00:00.000Z'],
            'exercises' => [['id' => $exerciseId, 'name' => 'Бурпі', 'description' => 'Зі стрибком']],
            'settings' => ['ladder' => Documents::ladderConfig()],
            'attempts' => [$earlier, $later],
            'events' => [['name' => 'workout_completed', 'mode' => 'ladder', 'outcome' => 'win', 'occurredAt' => '2026-11-02T12:00:00.000Z']],
        ], $this->responseData());
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
}
