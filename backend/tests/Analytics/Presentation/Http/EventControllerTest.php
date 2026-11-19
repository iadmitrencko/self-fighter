<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Tests\Shared\Presentation\Http\ApiTestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;

final class EventControllerTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // §23.1: the game needs an account, so a browser that has not signed in sends no event.
    public function testEventWithoutAccountIsRefused(): void
    {
        $this->send('POST', '/api/v1/events', ['name' => 'workout_started', 'mode' => 'fight']);

        $this->assertError(401, 'unauthorized');
        self::assertResponseNotHasCookie(self::DEVICE_COOKIE);
        self::assertSame(0, $this->rowCount('user'));
        self::assertSame([], $this->events());
    }

    // R5: the user comes from the device cookie, and the time from the server.
    public function testEventNamesTheUserOfTheBrowser(): void
    {
        $user = $this->signUp();
        self::mockTime('2026-11-03 10:05:00');

        $this->send('POST', '/api/v1/events', ['name' => 'workout_completed', 'mode' => 'fight', 'outcome' => 'win']);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(
            [['name' => 'workout_completed', 'mode' => 'fight', 'outcome' => 'win', 'error' => null, 'user_id' => UserId::fromString($user)->toBytes(), 'occurred_at' => '2026-11-03 10:05:00']],
            $this->events(),
        );
    }

    /**
     * @param array<mixed> $event
     */
    #[DataProvider('foreignEvents')]
    public function testEventsCarryNothingButTheirFields(array $event): void
    {
        $this->signUp();

        $this->send('POST', '/api/v1/events', $event);

        $this->assertError(422, 'invalid-event');
        self::assertSame([], $this->events());
    }

    /**
     * @return iterable<string, array{array<mixed>}>
     */
    public static function foreignEvents(): iterable
    {
        yield 'unknown event' => [['name' => 'page_viewed', 'mode' => 'fight']];
        yield 'unknown mode' => [['name' => 'workout_started', 'mode' => 'boxing']];
        // The modes of the site before a fight was put together freely (§6) are gone.
        yield 'an old mode' => [['name' => 'workout_started', 'mode' => 'ladder']];
        yield 'no mode' => [['name' => 'workout_repeated']];
        yield 'a user of its own' => [['name' => 'workout_started', 'mode' => 'fight', 'userId' => '019a3b2c-1d2e-7f30-8a41-b52c63d74e85']];
        yield 'a time of its own' => [['name' => 'workout_started', 'mode' => 'fight', 'occurredAt' => '2026-11-03T10:00:00.000Z']];
        yield 'an outcome of a start' => [['name' => 'workout_started', 'mode' => 'fight', 'outcome' => 'win']];
        yield 'a completion without its outcome' => [['name' => 'workout_completed', 'mode' => 'fight']];
        yield 'an unknown outcome' => [['name' => 'workout_completed', 'mode' => 'fight', 'outcome' => 'knockout']];
        yield 'a sentence for an error code' => [['name' => 'setup_error', 'mode' => 'fight', 'error' => 'Add an exercise']];
        yield 'a list of events' => [[['name' => 'workout_started', 'mode' => 'fight']]];
    }

    public function testEventsAreLimitedPerUser(): void
    {
        $user = $this->signUp();
        $this->exhaustLimit('analytics_event', $user);

        $this->send('POST', '/api/v1/events', ['name' => 'workout_started', 'mode' => 'fight']);

        $this->assertError(429, 'rate-limited');
    }

    // §15.5: the events stay in the numbers of §19, but they no longer lead to the deleted user.
    public function testDeletingTheUserKeepsItsEventsWithoutIt(): void
    {
        $this->signUp();
        $this->send('POST', '/api/v1/events', ['name' => 'workout_repeated', 'mode' => 'fight']);
        $mine = $this->deviceCookie();
        $this->switchBrowser();
        $other = $this->signUp();
        $this->send('POST', '/api/v1/events', ['name' => 'workout_started', 'mode' => 'fight']);

        $this->switchBrowser($mine);
        $this->send('DELETE', '/api/v1/me');

        self::assertResponseStatusCodeSame(204);
        self::assertSame(
            [['workout_repeated', null], ['workout_started', UserId::fromString($other)->toBytes()]],
            array_map(static fn (array $event): array => [$event['name'], $event['user_id']], $this->events()),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function events(): array
    {
        return $this->database()->fetchAllAssociative('SELECT name, mode, outcome, error, user_id, occurred_at FROM analytics_event ORDER BY mode, occurred_at');
    }
}
