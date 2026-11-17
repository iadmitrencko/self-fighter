<?php

declare(strict_types=1);

namespace App\Tests\Workout\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use App\Workout\Domain\AttemptId;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;

final class AttemptControllerTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    // The documents start on November 2 at 10:00, and the server takes a battle of the last days only (§24.4).
    protected function setUp(): void
    {
        parent::setUp();
        self::mockTime('2026-11-02 12:00:00');
    }

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
        $attempt = Documents::level();

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
        self::assertSame(['total' => 0, 'wins' => 0, 'draws' => 0, 'losses' => 0], $this->responseData());
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
        $level = Documents::level();
        $duel = Documents::duel();
        $exercises = static fn (array $exercises): array => [...$fight, 'config' => ['mode' => 'fight', 'exercises' => $exercises]];

        yield 'unknown field' => [[...$fight, 'rating' => 5]];
        yield 'missing result' => [array_diff_key($fight, ['result' => true])];
        yield 'mode of another config' => [[...$fight, 'mode' => 'campaign']];
        // The modes of the site before a fight was put together freely (§6) are gone, and so is the
        // field of their ready-made challenges.
        yield 'mode of the old site' => [[...$fight, 'mode' => 'ladder']];
        yield 'field of a ready-made challenge' => [[...$fight, 'challenge' => null]];
        yield 'unknown format version' => [[...$fight, 'schemaVersion' => 7]];
        yield 'previous format version' => [[...$fight, 'schemaVersion' => 5]];
        yield 'fight without a game' => [array_diff_key($fight, ['game' => true])];
        yield 'fight outside the game' => [[...$fight, 'game' => null]];
        yield 'fight that took the energy of the journey' => [[...$fight, 'game' => Documents::game('campaign')]];
        yield 'game without the time its energy is full' => [[...$fight, 'game' => ['pool' => 'fight']]];
        // §6: a fight put together freely is won or lost.
        yield 'fight with a draw' => [[...$fight, 'result' => [...$fight['result'], 'outcome' => 'draw']]];
        yield 'fight with a set of nothing' => [$exercises([['id' => 'squats', 'name' => 'Присідання', 'sets' => [0]]])];
        yield 'fight with too many repetitions' => [$exercises([['id' => 'squats', 'name' => 'Присідання', 'sets' => [1000]]])];
        yield 'fight of eleven rounds' => [$exercises([['id' => 'squats', 'name' => 'Присідання', 'sets' => array_fill(0, 11, 5)]])];
        yield 'empty exercise name' => [$exercises([['id' => 'push-ups', 'name' => '', 'sets' => [10]]])];
        yield 'level of the journey outside the game' => [[...$level, 'game' => null]];
        yield 'level that took the energy of fights' => [[...$level, 'game' => Documents::game('fight')]];
        yield 'level with a strange address' => [[...$level, 'config' => [...$level['config'], 'level' => 'Forest ravens/1/1']]];
        yield 'level without sets' => [[...$level, 'config' => [...$level['config'], 'sets' => []]]];
        yield 'set without repetitions' => [[...$level, 'config' => [...$level['config'], 'sets' => [0]]]];
        yield 'level with a draw' => [[...$level, 'result' => [...$level['result'], 'outcome' => 'draw']]];
        // §24.9: a battle of the duel takes the energy of the journey and names its round and place.
        yield 'duel that took the energy of fights' => [[...$duel, 'game' => Documents::game('fight')]];
        yield 'duel outside the game' => [[...$duel, 'game' => null]];
        yield 'duel without its place in the round' => [[...$duel, 'config' => array_diff_key($duel['config'], ['from' => true])]];
        yield 'duel set without its exercise' => [[...$duel, 'config' => [...$duel['config'], 'sets' => [['reps' => 15]]]]];
        yield 'id that is not UUID v7' => [[...$fight, 'id' => '6f9619ff-8b86-4011-b42d-00cf4fc964ff']];
        yield 'time with an offset' => [[...$fight, 'finishedAt' => '2026-11-02T12:18:24.000+02:00']];
        yield 'date that does not exist' => [[...$fight, 'finishedAt' => '2026-02-30T10:00:00.000Z']];
    }

    // §24: a fight of the game and a level of the journey are attempts of the history as well.
    public function testBattlesOfTheGameAreSaved(): void
    {
        $this->signUp();
        $fight = Documents::fight('loss');
        $level = Documents::level('forest-ravens/10/7', 'loss', sets: [1, 2, 3, 2, 1]);

        foreach ([$fight, $level] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
            self::assertResponseStatusCodeSame(201);

            $this->send('GET', '/api/v1/attempts/'.$attempt['id']);
            self::assertEquals($attempt, $this->responseData());
        }

        $this->send('GET', '/api/v1/attempts?mode=campaign');
        self::assertSame([$level['id']], array_column($this->listedItems(), 'id'));

        $this->send('GET', '/api/v1/attempts?mode=fight');
        self::assertSame([$fight['id']], array_column($this->listedItems(), 'id'));
    }

    // §24: the battles of the game, and the levels won once each.
    public function testGameRecordCountsTheBattlesOfTheGame(): void
    {
        $this->signUp();
        $attempts = [
            Documents::fight('win', '2026-11-02T10:30:00.000Z', '2026-11-02T13:00:00.000Z'),
            Documents::fight('loss', '2026-11-02T10:40:00.000Z', '2026-11-02T15:00:00.000Z'),
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
            'fights' => ['wins' => 1, 'draws' => 0, 'losses' => 1],
            'campaign' => ['wins' => 3, 'draws' => 0, 'losses' => 1],
            'passed' => ['forest-ravens/1/1', 'forest-ravens/1/2'],
            // §24.4: the server counts the energy itself, whatever the browser wrote: two fights
            // and four levels, all from 10:00, two hours each.
            'energy' => ['fight' => '2026-11-02T14:00:00.000Z', 'campaign' => '2026-11-02T18:00:00.000Z'],
            // §24.10: every battle adds its repetitions: the two fights and the sets of the levels.
            'exercises' => [
                'pull-ups' => ['best' => 1, 'total' => 11],
                'push-ups' => ['best' => 12, 'total' => 44],
                'squats' => ['best' => 20, 'total' => 50],
            ],
            // §24.12: every battle finished today, and §24.10: so did all the repetitions.
            'days' => ['2026-11-02'],
            'week' => ['2026-11-02' => ['pull-ups' => 11, 'push-ups' => 44, 'squats' => 50]],
            'duel' => [],
            'duelAt' => null,
        ], $this->responseData());

        // The history counts the same battles.
        $this->send('GET', '/api/v1/stats');
        self::assertSame(['total' => 6, 'wins' => 4, 'draws' => 0, 'losses' => 2], $this->responseData());
    }

    // §24.9: the duel with the King counts the sets done in their places, whatever battle did them.
    public function testGameRecordKeepsTheSetsOfTheDuel(): void
    {
        $this->signUp();
        $battles = [
            Documents::duel('final-battle/1/4', 'win', 0, [['push-ups', 15], ['squats', 25], ['pull-ups', 5]]),
            // The second battle goes on from the fourth set and stops before its last one.
            Documents::duel('final-battle/1/4', 'loss', 3, [['push-ups', 20], ['squats', 30], ['pull-ups', 7]], [
                'startedAt' => '2026-11-02T10:30:00.000Z',
                'finishedAt' => '2026-11-02T10:40:00.000Z',
            ]),
        ];

        foreach ($battles as $battle) {
            $this->send('PUT', '/api/v1/attempts/'.$battle['id'], $battle);
            self::assertResponseStatusCodeSame(201);
        }
        $this->send('GET', '/api/v1/attempts/'.$battles[1]['id']);
        self::assertEquals($battles[1], $this->responseData());

        $this->send('GET', '/api/v1/game');
        $record = $this->responseData();

        self::assertSame(['final-battle/1/4' => [0, 1, 2, 3, 4]], $record['duel'] ?? null);
        self::assertSame('2026-11-02T10:40:00.000Z', $record['duelAt'] ?? null);
        self::assertSame(['wins' => 1, 'draws' => 0, 'losses' => 1], $record['campaign'] ?? null);
        self::assertSame([], $record['passed'] ?? null);

        $this->send('GET', '/api/v1/attempts?mode=duel');
        self::assertSame([$battles[1]['id'], $battles[0]['id']], array_column($this->listedItems(), 'id'));
    }

    public function testGameRecordStartsEmpty(): void
    {
        $this->signUp();
        $empty = [
            'fights' => ['wins' => 0, 'draws' => 0, 'losses' => 0],
            'campaign' => ['wins' => 0, 'draws' => 0, 'losses' => 0],
            'passed' => [],
            'energy' => ['fight' => null, 'campaign' => null],
            'exercises' => [],
            'days' => [],
            'week' => [],
            'duel' => [],
            'duelAt' => null,
        ];

        $this->send('GET', '/api/v1/game');

        self::assertSame($empty, $this->responseData());
        self::assertStringContainsString('"exercises":{},"days":[],"week":{},"duel":{}', (string) $this->browser->getResponse()->getContent());
    }

    // §24.12, §24.10: the days with a battle and the repetitions of the last seven days go by the
    // calendar of the player; a zone the server does not know counts as UTC.
    public function testGameRecordKeepsTheDaysOfThePlayer(): void
    {
        $this->signUp();
        $attempts = [
            // Seven days ago: a day with a battle, yet out of the last seven days.
            Documents::fight('win', '2026-10-26T13:10:00.000Z', overrides: ['startedAt' => '2026-10-26T13:00:00.000Z']),
            // Late on November 1 by UTC, already November 2 in Kyiv.
            Documents::fight('win', '2026-11-01T22:10:00.000Z', overrides: ['startedAt' => '2026-11-01T21:50:00.000Z']),
            // A level today: pull-ups 1, 1 and 1.
            Documents::level(),
        ];

        foreach ($attempts as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
            self::assertResponseStatusCodeSame(201);
        }

        $this->send('GET', '/api/v1/game?tz=Europe/Kyiv');
        self::assertSame(['2026-10-26', '2026-11-02'], $this->responseData()['days'] ?? null);
        self::assertSame(['2026-11-02' => ['pull-ups' => 3, 'push-ups' => 22, 'squats' => 35]], $this->responseData()['week'] ?? null);

        foreach (['/api/v1/game?tz=UTC', '/api/v1/game?tz=Moon/Base', '/api/v1/game'] as $uri) {
            $this->send('GET', $uri);
            self::assertSame(['2026-10-26', '2026-11-01', '2026-11-02'], $this->responseData()['days'] ?? null);
            self::assertSame(
                ['2026-11-01' => ['push-ups' => 22, 'squats' => 35], '2026-11-02' => ['pull-ups' => 3]],
                $this->responseData()['week'] ?? null,
            );
        }
    }

    // §24.10: the sets done of every exercise in every battle, a custom exercise too; a set left undone adds nothing.
    public function testGameRecordAddsUpTheRepetitionsOfEveryExercise(): void
    {
        $this->signUp();
        $mine = $this->deviceCookie();
        $crunches = ['id' => '0195f2a4-6b1e-7c3d-8e9f-0a1b2c3d4e5f', 'name' => 'Скручування'];
        $pushUps = ['id' => 'push-ups', 'name' => 'Відтискання'];
        $attempts = [
            // Push-ups 10 and 12, squats 15; the last set of squats, 20, is left undone.
            Documents::fight('loss', '2026-11-02T10:30:00.000Z', '2026-11-02T13:00:00.000Z'),
            Documents::fight('win', '2026-11-02T10:40:00.000Z', '2026-11-02T15:00:00.000Z', [
                'config' => ['mode' => 'fight', 'exercises' => [[...$crunches, 'sets' => [30, 40]]]],
                'result' => [
                    'exercises' => [['exercise' => $crunches, 'sets' => [['target' => 30, 'done' => true], ['target' => 40, 'done' => true]]]],
                    'outcome' => 'win',
                ],
            ]),
            // Pull-ups 1, 2 and 3 of a level won.
            Documents::level('forest-ravens/2/3', 'win', sets: [1, 2, 3]),
            // Push-ups 3 and 2 of a level left before its last set, which adds nothing however large.
            Documents::level('black-flag/2/1', 'loss', sets: [3, 2, 9], exercise: $pushUps),
            // The duel names the exercise of every set: its last one, 5 pull-ups, is left undone.
            Documents::duel('final-battle/1/4', 'loss'),
        ];

        foreach ($attempts as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
            self::assertResponseStatusCodeSame(201);
        }
        // Another player does more, which changes nothing here.
        $this->switchBrowser();
        $this->signUp();
        $this->send('PUT', '/api/v1/attempts/'.($other = Documents::fight())['id'], $other);

        $this->switchBrowser($mine);
        $this->send('GET', '/api/v1/game');

        self::assertSame([
            $crunches['id'] => ['best' => 40, 'total' => 70],
            'pull-ups' => ['best' => 3, 'total' => 6],
            'push-ups' => ['best' => 15, 'total' => 42],
            'squats' => ['best' => 25, 'total' => 40],
        ], $this->responseData()['exercises'] ?? null);
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
        $morningWin = Documents::fight('win', '2026-11-01T08:00:00.000Z', overrides: ['startedAt' => '2026-11-01T07:40:00.000Z']);
        $eveningLoss = Documents::fight('loss', '2026-11-01T20:00:00.000Z', overrides: ['startedAt' => '2026-11-01T19:40:00.000Z']);
        $level = Documents::level(overrides: ['startedAt' => '2026-11-02T07:50:00.000Z', 'finishedAt' => '2026-11-02T08:00:00.000Z']);

        foreach ([$morningWin, $eveningLoss, $level] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $found = function (string $query): array {
            $this->send('GET', '/api/v1/attempts?'.$query);
            $items = $this->responseData()['items'];
            self::assertIsArray($items);

            return array_column($items, 'id');
        };

        self::assertSame([$eveningLoss['id'], $morningWin['id']], $found('mode=fight'));
        self::assertSame([$level['id'], $morningWin['id']], $found('outcome=win'));
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
        yield 'mode of the old site' => ['mode=ladder'];
        yield 'unknown outcome' => ['outcome=tie'];
        yield 'date without time' => ['from=2026-11-01'];
        yield 'zero page size' => ['limit=0'];
        yield 'page size above the maximum' => ['limit=101'];
        yield 'cursor that is not an id' => ['cursor=first'];
        yield 'cursor of an unknown attempt' => ['cursor='.AttemptId::generate()];
        yield 'list instead of a value' => ['mode[]=fight'];
    }

    // §14.2: the number of finished workouts equals wins plus draws plus losses.
    public function testStatisticsAgreeWithTheHistory(): void
    {
        $this->signUp();

        foreach ([Documents::fight('win'), Documents::fight('loss'), Documents::level('forest-ravens/1/1', 'win'), Documents::level('forest-ravens/1/2', 'loss')] as $attempt) {
            $this->send('PUT', '/api/v1/attempts/'.$attempt['id'], $attempt);
        }

        $this->send('GET', '/api/v1/stats');
        self::assertSame(['total' => 4, 'wins' => 2, 'draws' => 0, 'losses' => 2], $this->responseData());

        $this->send('GET', '/api/v1/stats?mode=campaign');
        self::assertSame(['total' => 2, 'wins' => 1, 'draws' => 0, 'losses' => 1], $this->responseData());
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
