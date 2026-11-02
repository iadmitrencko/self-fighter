<?php

declare(strict_types=1);

namespace App\Tests\Api;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Uid\UuidV7;

final class AttemptTest extends ApiTestCase
{
    public function testSavedAttemptCanBeReadBack(): void
    {
        $this->signUp();
        $attempt = Documents::fight();

        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        self::assertResponseStatusCodeSame(201);

        $this->send('GET', '/api/v1/attempts/'.$attempt['id']);

        self::assertResponseIsSuccessful();
        self::assertEquals($attempt, $this->responseData());
    }

    // §17.2: a retry after a lost response must not add a second record.
    public function testSendingTheSameAttemptAgainChangesNothing(): void
    {
        $this->signUp();
        $attempt = Documents::ladder();

        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(1, $this->rowCount('attempt'));
    }

    // §17.2: a finished attempt never changes.
    public function testOtherContentUnderSavedIdIsRefused(): void
    {
        $this->signUp();
        $attempt = Documents::fight('win');
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], Documents::fight('loss', overrides: ['id' => $attempt['id']]));

        $this->assertError(409, 'conflict');
        $this->send('GET', '/api/v1/attempts/'.$attempt['id']);
        self::assertEquals($attempt, $this->responseData());
    }

    public function testAttemptOfAnotherUserStaysOutOfReach(): void
    {
        $this->signUp();
        $attempt = Documents::fight();
        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        $this->switchBrowser();
        $this->signUp();

        $this->send('GET', '/api/v1/attempts/'.$attempt['id']);
        $this->assertError(404, 'not-found');

        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        $this->assertError(409, 'conflict');

        $this->send('GET', '/api/v1/attempts');
        self::assertSame(['items' => [], 'nextCursor' => null], $this->responseData());
    }

    /**
     * @param array<string, mixed> $attempt
     */
    #[DataProvider('invalidAttempts')]
    public function testAttemptOutsideTheFormatIsRefused(array $attempt): void
    {
        $this->signUp();
        $id = \is_string($attempt['id'] ?? null) && Uuid::fromString($attempt['id']) instanceof UuidV7 ? $attempt['id'] : Uuid::v7();

        $this->send('PUT', '/api/v1/attempts/'.$id, $attempt);

        $this->assertError(422, 'invalid-attempt');
        self::assertSame(0, $this->rowCount('attempt'));
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function invalidAttempts(): iterable
    {
        $fight = Documents::fight();
        $config = Documents::targetConfig();

        yield 'unknown field' => [[...$fight, 'rating' => 5]];
        yield 'missing result' => [array_diff_key($fight, ['result' => true])];
        yield 'mode of another config' => [[...$fight, 'mode' => 'ladder']];
        yield 'too many rounds' => [[...$fight, 'config' => [...$config, 'rounds' => 21]]];
        yield 'too many repetitions' => [[...$fight, 'config' => [...$config, 'exercises' => [['id' => 'push-ups', 'name' => 'Віджимання', 'targets' => [10_000]]]]]];
        yield 'empty exercise name' => [[...$fight, 'config' => [...$config, 'exercises' => [['id' => 'push-ups', 'name' => '', 'targets' => [10]]]]]];
        yield 'unknown format version' => [[...$fight, 'schemaVersion' => 2]];
        yield 'id that is not UUID v7' => [[...$fight, 'id' => Uuid::v4()->toRfc4122()]];
        yield 'time with an offset' => [[...$fight, 'finishedAt' => '2026-11-02T12:18:24.000+02:00']];
        yield 'date that does not exist' => [[...$fight, 'finishedAt' => '2026-02-30T10:00:00.000Z']];
    }

    public function testIdInPathMustMatchTheAttempt(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/attempts/'.Uuid::v7(), Documents::fight());

        $this->assertError(422, 'invalid-attempt');
    }

    public function testHistoryIsNewestFirstAndComesInPages(): void
    {
        $this->signUp();
        $ids = [];

        foreach (['09', '10', '11', '12', '13'] as $hour) {
            $attempt = Documents::fight(finishedAt: \sprintf('2026-11-02T%s:00:00.000Z', $hour));
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
            $ids[] = $attempt['id'];
        }

        $pages = [];
        $cursor = null;

        do {
            $this->send('GET', '/api/v1/attempts?limit=2'.(null === $cursor ? '' : '&cursor='.$cursor));
            $page = $this->responseData();
            self::assertIsArray($page['items']);
            $pages[] = array_column($page['items'], 'id');
            $cursor = $page['nextCursor'];
        } while (\is_string($cursor));

        self::assertSame([[$ids[4], $ids[3]], [$ids[2], $ids[1]], [$ids[0]]], $pages);
    }

    // Attempts that finished within the same second still keep a stable order across pages.
    public function testPagesDoNotLoseAttemptsFinishedTogether(): void
    {
        $this->signUp();
        $ids = [];

        for ($attempt = 1; $attempt <= 3; ++$attempt) {
            $document = Documents::fight(finishedAt: \sprintf('2026-11-02T10:00:00.%03dZ', $attempt));
            $this->send('PUT', '/api/v1/attempts/'.$document['id'], $document);
            $ids[] = $document['id'];
        }

        $this->send('GET', '/api/v1/attempts?limit=2');
        $first = $this->responseData();
        $this->send('GET', '/api/v1/attempts?limit=2&cursor='.$first['nextCursor']);
        $second = $this->responseData();

        self::assertIsArray($first['items']);
        self::assertIsArray($second['items']);
        self::assertEqualsCanonicalizing($ids, [...array_column($first['items'], 'id'), ...array_column($second['items'], 'id')]);
    }

    public function testHistoryFilters(): void
    {
        $this->signUp();
        $morningWin = Documents::fight('win', '2026-11-01T08:00:00.000Z');
        $eveningLoss = Documents::fight('loss', '2026-11-01T20:00:00.000Z');
        $ladder = Documents::ladder('win', '2026-11-02T08:00:00.000Z');

        foreach ([$morningWin, $eveningLoss, $ladder] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $found = function (string $query): array {
            $this->send('GET', '/api/v1/attempts?'.$query);
            $items = $this->responseData()['items'];
            self::assertIsArray($items);

            return array_column($items, 'id');
        };

        self::assertSame([$eveningLoss['id'], $morningWin['id']], $found('mode=target'));
        self::assertSame([$ladder['id'], $morningWin['id']], $found('outcome=win'));
        self::assertSame(
            [$eveningLoss['id']],
            $found('from=2026-11-01T12:00:00.000Z&to=2026-11-02T08:00:00.000Z'),
        );
    }

    #[DataProvider('invalidQueries')]
    public function testUnreadableQueryIsRefused(string $query): void
    {
        $this->signUp();

        $this->send('GET', '/api/v1/attempts?'.$query);

        $this->assertError(400, 'invalid-query');
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidQueries(): iterable
    {
        yield 'unknown mode' => ['mode=boxing'];
        yield 'unknown outcome' => ['outcome=tie'];
        yield 'date without time' => ['from=2026-11-01'];
        yield 'zero page size' => ['limit=0'];
        yield 'page size above the maximum' => ['limit=101'];
        yield 'cursor that is not an id' => ['cursor=first'];
        yield 'cursor of an unknown attempt' => ['cursor='.Uuid::v7()];
        yield 'list instead of a value' => ['mode[]=target'];
    }

    // §14.2: the number of finished workouts equals wins plus draws plus losses.
    public function testStatisticsAgreeWithTheHistory(): void
    {
        $this->signUp();

        foreach ([Documents::fight('win'), Documents::fight('draw'), Documents::fight('loss'), Documents::ladder('win')] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $this->send('GET', '/api/v1/stats');
        self::assertSame(['total' => 4, 'wins' => 2, 'draws' => 1, 'losses' => 1], $this->responseData());

        $this->send('GET', '/api/v1/stats?mode=ladder');
        self::assertSame(['total' => 1, 'wins' => 1, 'draws' => 0, 'losses' => 0], $this->responseData());
    }

    public function testWritesOfOneUserAreLimited(): void
    {
        $this->exhaustLimit('api_write', $this->signUp());
        $attempt = Documents::fight();

        $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);

        $this->assertError(429, 'rate-limited');
        self::assertSame(0, $this->rowCount('attempt'));
    }
}
