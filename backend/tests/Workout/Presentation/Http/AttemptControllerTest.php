<?php

declare(strict_types=1);

namespace App\Tests\Workout\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\AttemptId;
use PHPUnit\Framework\Attributes\DataProvider;

final class AttemptControllerTest extends ApiTestCase
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

        $this->send('GET', '/api/v1/stats');
        self::assertSame(['total' => 0, 'wins' => 0, 'draws' => 0, 'losses' => 0, 'challenges' => []], $this->responseData());
    }

    /**
     * @param array<string, mixed> $attempt
     */
    #[DataProvider('invalidAttempts')]
    public function testAttemptOutsideTheFormatIsRefused(array $attempt): void
    {
        $this->signUp();
        $id = AttemptId::tryFrom(\is_string($attempt['id'] ?? null) ? $attempt['id'] : '') ?? AttemptId::generate();

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
        $level = Documents::level();

        yield 'unknown field' => [[...$fight, 'rating' => 5]];
        yield 'missing result' => [array_diff_key($fight, ['result' => true])];
        yield 'mode of another config' => [[...$fight, 'mode' => 'ladder']];
        yield 'too many rounds' => [[...$fight, 'config' => [...$config, 'rounds' => 21]]];
        yield 'too many repetitions' => [[...$fight, 'config' => [...$config, 'exercises' => [['id' => 'push-ups', 'name' => 'Віджимання', 'targets' => [10_000]]]]]];
        yield 'empty exercise name' => [[...$fight, 'config' => [...$config, 'exercises' => [['id' => 'push-ups', 'name' => '', 'targets' => [10]]]]]];
        yield 'unknown format version' => [[...$fight, 'schemaVersion' => 4]];
        yield 'version 1 the API no longer takes' => [[...array_diff_key($fight, ['challenge' => true, 'game' => true]), 'schemaVersion' => 1]];
        yield 'no challenge' => [array_diff_key($fight, ['challenge' => true])];
        yield 'version 3 without a game' => [array_diff_key($fight, ['game' => true])];
        yield 'version 2 with a game' => [[...$fight, 'schemaVersion' => 2, 'game' => Documents::game()]];
        yield 'fight that took the energy of the journey' => [[...$fight, 'game' => Documents::game('campaign')]];
        yield 'game without the time its energy is full' => [[...$fight, 'game' => ['pool' => 'fight']]];
        yield 'level of the journey outside the game' => [[...$level, 'game' => null]];
        yield 'level that took the energy of fights' => [[...$level, 'game' => Documents::game('fight')]];
        yield 'level with a challenge' => [[...$level, 'challenge' => Documents::challenge('100-pull-ups')]];
        yield 'level of version 2' => [[...array_diff_key($level, ['game' => true]), 'schemaVersion' => 2]];
        yield 'level with a strange address' => [[...$level, 'config' => [...$level['config'], 'level' => 'Forest ravens/1/1']]];
        yield 'level without sets' => [[...$level, 'config' => [...$level['config'], 'sets' => []]]];
        yield 'set without repetitions' => [[...$level, 'config' => [...$level['config'], 'sets' => [0]]]];
        yield 'level with a draw' => [[...$level, 'result' => [...$level['result'], 'outcome' => 'draw']]];
        yield 'challenge with a strange address' => [[...$fight, 'challenge' => ['slug' => '100 Push-Ups', 'title' => '100 віджимань']]];
        yield 'challenge without a title' => [[...$fight, 'challenge' => ['slug' => '100-push-ups', 'title' => '']]];
        yield 'id that is not UUID v7' => [[...$fight, 'id' => '6f9619ff-8b86-4011-b42d-00cf4fc964ff']];
        yield 'time with an offset' => [[...$fight, 'finishedAt' => '2026-11-02T12:18:24.000+02:00']];
        yield 'date that does not exist' => [[...$fight, 'finishedAt' => '2026-02-30T10:00:00.000Z']];
    }

    // Section 3.7 of the plan: a tab opened before the release still sends version 2, and the
    // history keeps it as version 3 of a workout of the site.
    public function testAttemptOfThePreviousVersionIsUpgraded(): void
    {
        $this->signUp();
        $previous = [...array_diff_key(Documents::fight(), ['game' => true]), 'schemaVersion' => 2];

        $this->send('PUT', '/api/v1/attempts/'.$previous['id'], $previous);

        self::assertResponseStatusCodeSame(201);

        $this->send('PUT', '/api/v1/attempts/'.$previous['id'], $previous);

        self::assertResponseStatusCodeSame(204);

        $this->send('GET', '/api/v1/attempts/'.$previous['id']);

        self::assertEquals([...$previous, 'schemaVersion' => 3, 'game' => null], $this->responseData());
    }

    // §24: a fight of the game and a level of the journey are attempts of the history as well.
    public function testBattlesOfTheGameAreSaved(): void
    {
        $this->signUp();
        $fight = Documents::fight(overrides: ['game' => Documents::game()]);
        $level = Documents::level('forest-ravens/10/7', 'loss', sets: [1, 2, 3, 2, 1]);

        foreach ([$fight, $level] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
            self::assertResponseStatusCodeSame(201);

            $this->send('GET', '/api/v1/attempts/'.$attempt['id']);
            self::assertEquals($attempt, $this->responseData());
        }

        $this->send('GET', '/api/v1/attempts?mode=campaign');
        self::assertSame([$level['id']], array_column($this->listedItems(), 'id'));
    }

    // §24: the game counts its own battles only, and the levels won once each.
    public function testGameRecordCountsTheBattlesOfTheGame(): void
    {
        $this->signUp();
        $attempts = [
            Documents::fight('win'),
            Documents::fight('win', overrides: ['game' => Documents::game('fight', '2026-11-02T14:00:00.000Z')]),
            Documents::fight('draw', overrides: ['game' => Documents::game('fight', '2026-11-02T16:00:00.000Z')]),
            Documents::ladder('loss', overrides: ['game' => Documents::game('fight', '2026-11-02T12:00:00.000Z')]),
            Documents::level('forest-ravens/1/2', 'loss', '2026-11-02T15:00:00.000Z'),
            Documents::level('forest-ravens/1/2', 'win', '2026-11-02T20:00:00.000Z'),
            Documents::level('forest-ravens/1/1', 'win', '2026-11-02T10:05:00.000Z'),
            Documents::level('forest-ravens/1/1', 'win', '2026-11-02T13:00:00.000Z'),
        ];

        foreach ($attempts as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $this->send('GET', '/api/v1/game');
        self::assertSame([
            'fights' => ['wins' => 1, 'draws' => 1, 'losses' => 1],
            'campaign' => ['wins' => 3, 'draws' => 0, 'losses' => 1],
            'passed' => ['forest-ravens/1/1', 'forest-ravens/1/2'],
            'energy' => ['fight' => '2026-11-02T16:00:00.000Z', 'campaign' => '2026-11-02T20:00:00.000Z'],
        ], $this->responseData());

        // The history still counts every attempt, the workouts of the site included.
        $this->send('GET', '/api/v1/stats');
        self::assertSame(['total' => 8, 'wins' => 5, 'draws' => 1, 'losses' => 2, 'challenges' => []], $this->responseData());
    }

    public function testGameRecordStartsEmpty(): void
    {
        $this->signUp();
        $this->send('PUT', '/api/v1/attempts/'.($fight = Documents::fight())['id'], $fight);

        $this->send('GET', '/api/v1/game');

        self::assertSame([
            'fights' => ['wins' => 0, 'draws' => 0, 'losses' => 0],
            'campaign' => ['wins' => 0, 'draws' => 0, 'losses' => 0],
            'passed' => [],
            'energy' => ['fight' => null, 'campaign' => null],
        ], $this->responseData());
    }

    /**
     * @return list<array<mixed>>
     */
    private function listedItems(): array
    {
        $items = $this->responseData()['items'];
        self::assertIsArray($items);

        return array_values(array_filter($items, 'is_array'));
    }

    public function testIdInPathMustMatchTheAttempt(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/attempts/'.AttemptId::generate(), Documents::fight());

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
        yield 'cursor of an unknown attempt' => ['cursor='.AttemptId::generate()];
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
        self::assertSame(['total' => 4, 'wins' => 2, 'draws' => 1, 'losses' => 1, 'challenges' => []], $this->responseData());

        $this->send('GET', '/api/v1/stats?mode=ladder');
        self::assertSame(['total' => 1, 'wins' => 1, 'draws' => 0, 'losses' => 0, 'challenges' => []], $this->responseData());
    }

    // §21.3: a challenge is passed by a win and counts once, however often it is tried.
    public function testStatisticsNameTheChallengesPassed(): void
    {
        $this->signUp();
        $squats = ['challenge' => Documents::challenge('100-squats')];
        $ladder = ['challenge' => Documents::challenge('pull-ups-ladder-to-3')];
        $attempts = [
            Documents::fight('loss', overrides: $squats),
            Documents::fight('win', overrides: $squats),
            Documents::fight('win', overrides: $squats),
            Documents::fight('draw', overrides: ['challenge' => Documents::challenge('100-push-ups')]),
            Documents::ladder('win', overrides: $ladder),
        ];

        foreach ($attempts as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $this->send('GET', '/api/v1/stats');
        self::assertSame(
            ['total' => 5, 'wins' => 3, 'draws' => 1, 'losses' => 1, 'challenges' => ['100-squats', 'pull-ups-ladder-to-3']],
            $this->responseData(),
        );

        $this->send('GET', '/api/v1/stats?mode=target');
        self::assertSame(['total' => 4, 'wins' => 2, 'draws' => 1, 'losses' => 1, 'challenges' => ['100-squats']], $this->responseData());

        $this->send('GET', '/api/v1/stats?outcome=loss');
        self::assertSame(['total' => 1, 'wins' => 0, 'draws' => 0, 'losses' => 1, 'challenges' => []], $this->responseData());
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
