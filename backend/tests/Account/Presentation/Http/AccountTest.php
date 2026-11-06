<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\ExerciseId;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * An account on a browser: signing out, joining the guest of the browser and deleting it (§15.5, §23).
 */
final class AccountTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // §23.2: after signing out the browser is its guest again and the data of the account is out of reach.
    public function testSigningOutBringsBackTheGuestOfTheBrowser(): void
    {
        [, $guest, , $guestAttempt] = $this->accountWithGuestOnThisBrowser();
        $accountCookie = $this->deviceCookie();

        $this->send('POST', '/api/v1/me/logout');

        self::assertResponseIsSuccessful();
        self::assertSame(['id' => $guest, 'kind' => 'guest'], array_intersect_key($this->user($this->responseData()), ['id' => 1, 'kind' => 1]));
        self::assertNull($this->responseData()['guest']);
        self::assertNotSame($accountCookie->getValue(), $this->deviceCookie()->getValue());
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$guestAttempt], $this->attemptIds());

        // The old token led to the account and leads nowhere now.
        $this->switchBrowser($accountCookie);
        $this->send('GET', '/api/v1/me');
        self::assertSame(['user' => null, 'guest' => null], $this->responseData());
    }

    public function testSigningOutWithoutAGuestLeavesNoUser(): void
    {
        $this->signInWithGoogle(['sub' => '1001']);

        $this->send('POST', '/api/v1/me/logout');

        self::assertSame(['user' => null, 'guest' => null], $this->responseData());
        self::assertTrue($this->issuedCookie()->isCleared());
        self::assertSame(0, $this->rowCount('device'));
        self::assertSame(1, $this->rowCount('user'));
    }

    // A guest has no other way to its data, so it cannot sign out.
    public function testGuestCannotSignOut(): void
    {
        $this->signUp();

        $this->send('POST', '/api/v1/me/logout');

        $this->assertError(409, 'not-signed-in');
        self::assertSame(1, $this->rowCount('device'));
    }

    // §23.3: attempts move with their ids, exercises with the same name merge, the account keeps its settings.
    public function testJoiningTheGuestBringsItsDataOnce(): void
    {
        self::mockTime('2026-11-04 10:00:00');
        $this->signInWithGoogle(['sub' => '1001']);
        $accountBurpees = ExerciseId::generate()->value;
        $this->send('PUT', '/api/v1/exercises/'.$accountBurpees, ['name' => 'Бурпі', 'description' => 'Як у залі']);
        $this->send('PUT', '/api/v1/settings/target', Documents::targetConfig());
        $accountAttempt = Documents::fight('win', '2026-11-03T10:00:00.000Z');
        $this->send('PUT', '/api/v1/attempts/'.$accountAttempt['id'], $accountAttempt);
        $account = $this->user()['id'] ?? null;

        $this->switchBrowser();
        $this->signUp();
        $plank = ExerciseId::generate()->value;
        $this->send('PUT', '/api/v1/exercises/'.ExerciseId::generate(), ['name' => 'бурпі', 'description' => 'Вдома']);
        $this->send('PUT', '/api/v1/exercises/'.$plank, ['name' => 'Планка', 'description' => '']);
        $this->send('PUT', '/api/v1/settings/target', [...Documents::targetConfig(), 'rounds' => 1]);
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());
        $guestAttempt = Documents::ladder('loss', '2026-11-04T09:00:00.000Z');
        $this->send('PUT', '/api/v1/attempts/'.$guestAttempt['id'], $guestAttempt);
        $this->send('POST', '/api/v1/events', ['name' => 'workout_completed', 'mode' => 'ladder', 'outcome' => 'loss']);
        $this->signInWithGoogle(['sub' => '1001']);

        $this->send('POST', '/api/v1/me/merge');

        self::assertResponseIsSuccessful();
        self::assertSame([$account, null], [$this->user($this->responseData())['id'] ?? null, $this->responseData()['guest']]);
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$guestAttempt['id'], $accountAttempt['id']], $this->attemptIds());
        $this->send('GET', '/api/v1/exercises');
        self::assertSame(
            [['id' => $accountBurpees, 'name' => 'Бурпі', 'description' => 'Як у залі'], ['id' => $plank, 'name' => 'Планка', 'description' => '']],
            $this->responseData(),
        );
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(['target' => Documents::targetConfig(), 'ladder' => Documents::ladderConfig()], $this->responseData());
        self::assertSame(1, $this->rowCount('user'));
        self::assertSame(1, (int) $this->database()->fetchOne('SELECT COUNT(*) FROM analytics_event WHERE user_id IS NOT NULL'));

        // Asking again, as a second tab would, adds nothing.
        $this->send('POST', '/api/v1/me/merge');

        self::assertResponseIsSuccessful();
        self::assertSame(2, $this->rowCount('attempt'));
        self::assertSame(2, $this->rowCount('custom_exercise'));
    }

    // §23.3: a person who did not join the guest finds it again after signing out.
    public function testGuestNobodyJoinedWaitsForTheBrowser(): void
    {
        [, $guest, $accountAttempt, $guestAttempt] = $this->accountWithGuestOnThisBrowser();

        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$accountAttempt], $this->attemptIds());

        $this->send('POST', '/api/v1/me/logout');
        self::assertSame($guest, $this->user($this->responseData())['id'] ?? null);
        $this->send('GET', '/api/v1/attempts');

        self::assertSame([$guestAttempt], $this->attemptIds());
    }

    // §15.5: deleting the account takes its way to sign in; a browser that kept its guest goes back to it.
    public function testDeletingTheAccountLeavesTheGuestsOfItsBrowsers(): void
    {
        [, $guest, , $guestAttempt] = $this->accountWithGuestOnThisBrowser();
        $thisBrowser = $this->deviceCookie();
        $this->switchBrowser();
        $this->signInWithGoogle(['sub' => '1001']);
        $otherBrowser = $this->deviceCookie();

        $this->switchBrowser($thisBrowser);
        $this->send('DELETE', '/api/v1/me');

        self::assertResponseStatusCodeSame(204);
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        $this->send('GET', '/api/v1/me');
        self::assertSame(['id' => $guest, 'kind' => 'guest'], array_intersect_key($this->user(), ['id' => 1, 'kind' => 1]));
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$guestAttempt], $this->attemptIds());
        // Nothing of the account is left: only the guest and its attempt remain.
        self::assertSame(
            ['user_identity' => 0, 'user' => 1, 'attempt' => 1],
            ['user_identity' => $this->rowCount('user_identity'), 'user' => $this->rowCount('user'), 'attempt' => $this->rowCount('attempt')],
        );

        $this->switchBrowser($otherBrowser);
        $this->send('GET', '/api/v1/me');
        self::assertSame(['user' => null, 'guest' => null], $this->responseData());
    }

    // §15.5: the file names the account, its way to sign in and its profile.
    public function testExportOfAnAccountNamesItsWayToSignIn(): void
    {
        self::mockTime('2026-11-04 12:00:00');
        $this->signInWithGoogle(['sub' => '1001', 'name' => 'Олена', 'email' => 'olena@example.com']);

        $this->send('GET', '/api/v1/me/export');

        $data = $this->responseData();
        self::assertSame(['kind' => 'account', 'name' => 'Олена', 'email' => 'olena@example.com'], array_intersect_key(
            \is_array($data['user'] ?? null) ? $data['user'] : [],
            ['kind' => 1, 'name' => 1, 'email' => 1],
        ));
        self::assertSame([['provider' => 'google', 'subject' => '1001', 'createdAt' => '2026-11-04T12:00:00.000Z']], $data['identities']);
    }

    /**
     * An account with an attempt, open on a browser whose guest has an attempt too and was not joined.
     *
     * @return array{string, string, string, string} the ids of the account, the guest and their attempts
     */
    private function accountWithGuestOnThisBrowser(): array
    {
        $this->signInWithGoogle(['sub' => '1001']);
        $accountAttempt = Documents::fight('win', '2026-11-03T10:00:00.000Z');
        $this->send('PUT', '/api/v1/attempts/'.$accountAttempt['id'], $accountAttempt);
        $account = $this->user()['id'] ?? null;

        $this->switchBrowser();
        $guest = $this->signUp();
        $guestAttempt = Documents::ladder('loss', '2026-11-04T09:00:00.000Z');
        $this->send('PUT', '/api/v1/attempts/'.$guestAttempt['id'], $guestAttempt);
        $this->signInWithGoogle(['sub' => '1001']);

        self::assertIsString($account);
        self::assertIsString($accountAttempt['id']);
        self::assertIsString($guestAttempt['id']);

        return [$account, $guest, $accountAttempt['id'], $guestAttempt['id']];
    }

    /**
     * The user the answer names, or the user of the browser.
     *
     * @param array<mixed>|null $answer
     *
     * @return array<string, mixed>
     */
    private function user(?array $answer = null): array
    {
        if (null === $answer) {
            $this->send('GET', '/api/v1/me');
            $answer = $this->responseData();
        }
        $user = $answer['user'] ?? null;
        self::assertIsArray($user);

        /* @var array<string, mixed> $user */
        return $user;
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
