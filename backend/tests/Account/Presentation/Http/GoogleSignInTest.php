<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Tests\Account\FakeGoogle;
use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\ExerciseId;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * §23.2–§23.3: signing in with Google through the server, from a screen of the game and back to it.
 */
final class GoogleSignInTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // Section 3.7 of the plan: the authorization code flow with state and PKCE, and only the basic scopes.
    public function testSignsInThroughGoogleWithStateAndPkce(): void
    {
        $this->browser->request('GET', '/connect/google?to=/game/history');

        $location = (string) $this->browser->getResponse()->headers->get('Location');
        $parameters = $this->authorizationParameters();
        self::assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $location);
        self::assertSame([
            'client_id' => FakeGoogle::CLIENT_ID,
            'redirect_uri' => 'https://localhost/connect/google/check',
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $parameters['state'],
            'code_challenge' => $parameters['code_challenge'],
            'code_challenge_method' => 'S256',
            'prompt' => 'select_account',
        ], $parameters);
        self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $parameters['state']);

        FakeGoogle::willIdentify(['sub' => '1001']);
        $this->browser->request('GET', '/connect/google/check?'.http_build_query(['state' => $parameters['state'], 'code' => 'the-code']));

        self::assertResponseRedirects('/game/history?sign-in=done');
        [$exchange] = FakeGoogle::requests();
        self::assertSame('https://oauth2.googleapis.com/token', $exchange['url']);
        self::assertSame('authorization_code', $exchange['body']['grant_type']);
        self::assertSame('the-code', $exchange['body']['code']);
        self::assertSame('https://localhost/connect/google/check', $exchange['body']['redirect_uri']);
        self::assertSame([FakeGoogle::CLIENT_ID, FakeGoogle::CLIENT_SECRET], [$exchange['body']['client_id'], $exchange['body']['client_secret']]);
        // Only the browser that started the sign-in holds the verifier behind the challenge.
        self::assertIsString($exchange['body']['code_verifier']);
        self::assertSame(
            $parameters['code_challenge'],
            rtrim(strtr(base64_encode(hash('sha256', $exchange['body']['code_verifier'], true)), '+/', '-_'), '='),
        );
    }

    // §23.3: a Google account used for the first time turns the guest into the account; nothing moves.
    public function testFirstSignInKeepsTheDataOfTheGuest(): void
    {
        self::mockTime('2026-11-04 10:00:00');
        $guest = $this->signUp();
        $attempt = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $guestCookie = $this->deviceCookie();

        self::assertSame('/game/history?sign-in=done', $this->signInWithGoogle(['sub' => '1001', 'name' => 'Олена', 'email' => 'olena@example.com']));

        self::assertNotSame($guestCookie->getValue(), $this->deviceCookie()->getValue());
        self::assertSame([
            'user' => ['id' => $guest, 'kind' => 'account', 'createdAt' => '2026-11-04T10:00:00.000Z', 'name' => 'Олена', 'email' => 'olena@example.com'],
            'guest' => null,
        ], $this->me());
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$attempt['id']], array_column($this->listed(), 'id'));
        self::assertSame(1, $this->rowCount('user'));
        self::assertSame(
            [['provider' => 'google', 'subject' => '1001']],
            $this->database()->fetchAllAssociative('SELECT provider, subject FROM user_identity'),
        );
    }

    // §23.4: a later sign-in with email trusts only an address Google has confirmed.
    public function testKeepsOnlyAConfirmedEmail(): void
    {
        $this->signInWithGoogle(['sub' => '1001', 'email' => 'olena@example.com', 'email_verified' => false]);

        $user = $this->me()['user'];
        self::assertIsArray($user);
        self::assertArrayHasKey('email', $user);
        self::assertNull($user['email']);
    }

    // Section 8 of the plan: a token planted in the browser beforehand opens nothing after signing in.
    public function testSigningInReplacesTheTokenOfTheBrowser(): void
    {
        $this->signUp();
        $planted = $this->deviceCookie();

        $this->signInWithGoogle(['sub' => '1001']);
        $this->switchBrowser($planted);

        self::assertSame(['user' => null, 'guest' => null], $this->me());
    }

    // §23.1: a browser without a guest gets a new account, and another browser opens the same one.
    public function testTheAccountOpensOnAnyBrowser(): void
    {
        $this->signInWithGoogle(['sub' => '1001']);
        $account = $this->me()['user']['id'] ?? null;
        $attempt = Documents::ladder();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        $this->switchBrowser();
        $this->signInWithGoogle(['sub' => '1001', 'name' => 'Олена Нова']);

        $me = $this->me();
        self::assertSame($account, $me['user']['id'] ?? null);
        self::assertSame('Олена Нова', $me['user']['name'] ?? null);
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([$attempt['id']], array_column($this->listed(), 'id'));
        self::assertSame(2, $this->rowCount('device'));
    }

    // §23.3: the person decides whether to join a guest that has attempts or custom exercises.
    public function testGuestWithDataStaysWithTheBrowserUntilThePersonDecides(): void
    {
        $this->signInWithGoogle(['sub' => '1001']);
        $account = $this->me()['user']['id'] ?? null;

        $this->switchBrowser();
        $guest = $this->signUp();
        $attempt = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $this->send('PUT', '/api/v1/exercises/'.ExerciseId::generate(), ['name' => 'Бурпі', 'description' => '']);

        $this->signInWithGoogle(['sub' => '1001']);

        self::assertSame($account, $this->me()['user']['id'] ?? null);
        self::assertSame(['id' => $guest, 'attempts' => 1, 'exercises' => 1], $this->me()['guest']);
        // The history of the account does not show the attempts of the guest.
        $this->send('GET', '/api/v1/attempts');
        self::assertSame([], $this->listed());
    }

    // §23.3: a guest with nothing to miss joins without a question: settings and events come along.
    public function testGuestWithNothingToMissJoinsAtOnce(): void
    {
        $this->signInWithGoogle(['sub' => '1001']);
        $this->send('PUT', '/api/v1/settings/target', Documents::targetConfig());
        $account = $this->me()['user']['id'] ?? null;

        $this->switchBrowser();
        $this->signUp();
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());
        $this->send('POST', '/api/v1/events', ['name' => 'setup_error', 'mode' => 'ladder', 'error' => 'ladder-max-required']);

        $this->signInWithGoogle(['sub' => '1001']);

        $me = $this->me();
        self::assertSame([$account, null], [$me['user']['id'] ?? null, $me['guest']]);
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(['target' => Documents::targetConfig(), 'ladder' => Documents::ladderConfig()], $this->responseData());
        self::assertSame(1, $this->rowCount('user'));
        self::assertSame([$account], $this->eventUsers());
    }

    // The person changed their mind on the page of Google.
    public function testCancelledSignInLeavesTheBrowserAsItWas(): void
    {
        $guest = $this->signUp();
        $this->browser->request('GET', '/connect/google?to=/game/settings');
        $state = $this->authorizationParameters()['state'] ?? '';

        $this->browser->request('GET', '/connect/google/check?'.http_build_query(['error' => 'access_denied', 'state' => $state]));

        self::assertResponseRedirects('/game/settings?sign-in=cancelled');
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        self::assertSame($guest, $this->me()['user']['id'] ?? null);
        self::assertSame([], FakeGoogle::requests());
    }

    // An answer with a state this browser did not start, as a page of an attacker would send it.
    public function testRefusesAnAnswerToAnotherSignIn(): void
    {
        $this->browser->request('GET', '/connect/google?to=/game/settings');

        $this->browser->request('GET', '/connect/google/check?'.http_build_query(['state' => 'forged', 'code' => 'code-of-the-attacker']));

        self::assertResponseRedirects('/game/settings?sign-in=failed');
        self::assertSame([], FakeGoogle::requests());
        self::assertSame(0, $this->rowCount('user'));
    }

    // The state is spent with the first answer, so a repeated one finishes nothing.
    public function testAnswerWorksOnce(): void
    {
        $this->browser->request('GET', '/connect/google?to=/game/settings');
        $answer = '/connect/google/check?'.http_build_query(['state' => $this->authorizationParameters()['state'] ?? '', 'code' => 'the-code']);
        $this->browser->request('GET', $answer);

        $this->browser->request('GET', $answer);

        self::assertResponseRedirects('/game/settings?sign-in=failed');
        self::assertCount(1, FakeGoogle::requests());
    }

    public function testFailureOfGoogleLeavesTheBrowserAsItWas(): void
    {
        $guest = $this->signUp();
        $cookie = $this->deviceCookie();
        $this->browser->request('GET', '/connect/google');
        FakeGoogle::willRefuse(400);

        $this->browser->request('GET', '/connect/google/check?'.http_build_query(['state' => $this->authorizationParameters()['state'] ?? '', 'code' => 'expired']));

        self::assertResponseRedirects('/game/settings?sign-in=failed');
        self::assertSame($cookie->getValue(), $this->deviceCookie()->getValue());
        self::assertSame(['id' => $guest, 'kind' => 'guest'], array_intersect_key($this->me()['user'] ?? [], ['id' => 1, 'kind' => 1]));
        self::assertSame(0, $this->rowCount('user_identity'));
    }

    /**
     * @param array<string, mixed> $claims
     */
    #[DataProvider('foreignTokens')]
    public function testRefusesAnIdTokenNotMeantForThisClient(array $claims): void
    {
        self::assertSame('/game/history?sign-in=failed', $this->signInWithGoogle($claims));

        self::assertSame(0, $this->rowCount('user'));
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function foreignTokens(): iterable
    {
        yield 'another client' => [['aud' => 'another-client']];
        yield 'another issuer' => [['iss' => 'https://accounts.example.com']];
        yield 'expired long ago' => [['exp' => 1_700_000_000]];
        yield 'no subject' => [['sub' => '']];
        yield 'a subject of spaces' => [['sub' => 'two words']];
    }

    // Only screens of the game are a way back, so the sign-in cannot send a person to another site.
    #[DataProvider('foreignReturns')]
    public function testReturnsOnlyToTheGame(string $returnTo): void
    {
        self::assertSame('/game/settings?sign-in=done', $this->signInWithGoogle([], $returnTo));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function foreignReturns(): iterable
    {
        yield 'another site' => ['https://evil.example/game'];
        yield 'a protocol-relative address' => ['//evil.example/game'];
        yield 'a page of the site' => ['/privacy'];
        yield 'a path that climbs out' => ['/game/../privacy'];
        yield 'a query' => ['/game?next=https://evil.example'];
        yield 'a section that only starts like the game' => ['/gameover'];
        // §24.1: the workouts of /workout are gone, and so is the way back to them.
        yield 'the removed workouts' => ['/workout/setup/ladder'];
    }

    // §24.1: the screens of the cossack game, its fights and its history among them, are a way back.
    #[DataProvider('screens')]
    public function testReturnsToTheScreenItLeft(string $screen): void
    {
        self::assertSame($screen.'?sign-in=done', $this->signInWithGoogle([], $screen));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function screens(): iterable
    {
        yield 'the setup of a fight' => ['/game/fight/setup/ladder'];
        yield 'the history in the game' => ['/game/history'];
        yield 'the settings of the game' => ['/game/settings'];
        yield 'the result of a fight of the game' => ['/game/fight/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85'];
    }

    // Only signing in starts a session, and the answer of Google ends it.
    public function testTheSessionEndsWithTheAnswerOfGoogle(): void
    {
        $this->browser->request('GET', '/connect/google');

        self::assertFalse($this->sessionCookie()->isCleared());

        $this->browser->request('GET', '/connect/google/check?'.http_build_query(['state' => $this->authorizationParameters()['state'] ?? '', 'code' => 'the-code']));

        self::assertTrue($this->sessionCookie()->isCleared());
    }

    public function testStartsAreLimitedPerAddress(): void
    {
        $this->exhaustLimit('sign_in', $this->address);

        $this->browser->request('GET', '/connect/google?to=/game/history');

        self::assertResponseRedirects('/game/history?sign-in=failed');
    }

    /**
     * @return array{user: array<mixed>|null, guest: array<mixed>|null}
     */
    private function me(): array
    {
        $this->send('GET', '/api/v1/me');
        $data = $this->responseData();
        $user = $data['user'] ?? null;
        $guest = $data['guest'] ?? null;

        if ((null !== $user && !\is_array($user)) || (null !== $guest && !\is_array($guest))) {
            self::fail('The answer does not describe the browser.');
        }

        return ['user' => $user, 'guest' => $guest];
    }

    /**
     * @return list<array<mixed>>
     */
    private function listed(): array
    {
        $items = $this->responseData()['items'] ?? null;

        if (!\is_array($items)) {
            self::fail('The answer lists no attempts.');
        }

        return array_values(array_filter($items, 'is_array'));
    }

    private function sessionCookie(): Cookie
    {
        foreach ($this->browser->getResponse()->headers->getCookies() as $cookie) {
            if (self::DEVICE_COOKIE !== $cookie->getName()) {
                return $cookie;
            }
        }

        self::fail('The response does not set the cookie of the session.');
    }

    /**
     * @return list<string|null>
     */
    private function eventUsers(): array
    {
        return array_map(
            static fn (mixed $id): ?string => \is_string($id) ? UserId::fromBytes($id)->value : null,
            $this->database()->fetchFirstColumn('SELECT user_id FROM analytics_event'),
        );
    }
}
