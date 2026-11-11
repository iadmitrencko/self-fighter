<?php

declare(strict_types=1);

namespace App\Tests\Workout\Domain;

use App\Shared\Domain\UserId;
use App\Tests\Workout\Documents;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\GamePool;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AttemptTest extends TestCase
{
    public function testReadsWhatTheHistoryNeeds(): void
    {
        $document = Documents::fight('draw', '2026-11-02T10:18:24.051Z');

        $attempt = Attempt::fromDocument(UserId::generate(), $document);

        self::assertNotNull($attempt);
        self::assertSame($document['id'], $attempt->id()->value);
        self::assertEquals(new \DateTimeImmutable('2026-11-02 10:18:24.051 UTC'), $attempt->finishedAt());
        self::assertSame($document, $attempt->document());
    }

    // §21.3: the statistics count the challenges an attempt passed.
    public function testRemembersTheChallengeOfTheAttempt(): void
    {
        $owner = UserId::generate();

        self::assertSame('100-push-ups', $this->attemptOf($owner, Documents::fight(overrides: ['challenge' => Documents::challenge('100-push-ups')]))->challenge());
        self::assertNull($this->attemptOf($owner, Documents::fight())->challenge());
    }

    // §24: the record of the game counts the battles by pool, the levels won and the energy.
    public function testRemembersTheBattleOfTheGame(): void
    {
        $owner = UserId::generate();
        $workout = $this->attemptOf($owner, Documents::fight());
        $fight = $this->attemptOf($owner, Documents::fight(overrides: ['game' => Documents::game('fight', '2026-11-02T12:00:00.000Z')]));
        $level = $this->attemptOf($owner, Documents::level('forest-ravens/2/3', energyFullAt: '2026-11-02T15:00:00.000Z'));

        self::assertNull($workout->pool());
        self::assertNull($workout->level());
        self::assertNull($workout->energyFullAt());
        self::assertSame(GamePool::Fight, $fight->pool());
        self::assertNull($fight->level());
        self::assertEquals(new \DateTimeImmutable('2026-11-02 12:00:00 UTC'), $fight->energyFullAt());
        self::assertSame(GamePool::Campaign, $level->pool());
        self::assertSame('forest-ravens/2/3', $level->level());
        self::assertEquals(new \DateTimeImmutable('2026-11-02 15:00:00 UTC'), $level->energyFullAt());
    }

    /**
     * @param array<string, mixed> $change
     */
    #[DataProvider('incompleteDocuments')]
    public function testRefusesADocumentWithoutTheseFields(array $change): void
    {
        self::assertNull(Attempt::fromDocument(UserId::generate(), [...Documents::fight(), ...$change]));
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function incompleteDocuments(): iterable
    {
        yield 'id' => [['id' => 'attempt-1']];
        yield 'mode' => [['mode' => 'boxing']];
        yield 'outcome' => [['result' => []]];
        yield 'finish time' => [['finishedAt' => '2026-02-30T10:00:00.000Z']];
        yield 'format version' => [['schemaVersion' => '1']];
        yield 'pool of the game' => [['game' => ['pool' => 'arena', 'energyFullAt' => '2026-11-02T12:00:00.000Z']]];
        yield 'time the energy is full' => [['game' => ['pool' => 'fight', 'energyFullAt' => 'soon']]];
    }

    /**
     * @param array<string, mixed> $change
     */
    #[DataProvider('incompleteLevels')]
    public function testRefusesALevelWithoutTheseFields(array $change): void
    {
        self::assertNull(Attempt::fromDocument(UserId::generate(), [...Documents::level(), ...$change]));
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function incompleteLevels(): iterable
    {
        yield 'game' => [['game' => null]];
        yield 'pool of the journey' => [['game' => Documents::game('fight')]];
        yield 'level' => [['config' => ['mode' => 'campaign', 'sets' => [1]]]];
    }

    // MySQL hands back JSON objects with sorted keys, which must not look like another attempt.
    public function testKeyOrderDoesNotChangeTheDocument(): void
    {
        $owner = UserId::generate();
        $document = Documents::ladder();
        $reordered = array_reverse($document, true);
        $reordered['result'] = array_reverse($reordered['result'], true);

        self::assertTrue($this->attemptOf($owner, $document)->hasSameDocument($this->attemptOf($owner, $reordered)));
    }

    public function testAnyOtherValueChangesTheDocument(): void
    {
        $owner = UserId::generate();
        $document = Documents::ladder();
        $changed = $document;
        $changed['result']['stages'] = array_reverse($document['result']['stages']);

        self::assertFalse($this->attemptOf($owner, $document)->hasSameDocument($this->attemptOf($owner, $changed)));
        self::assertFalse($this->attemptOf($owner, $document)->hasSameDocument($this->attemptOf($owner, [...$document, 'durationMs' => 1])));
    }

    public function testBelongsToItsOwnerOnly(): void
    {
        $owner = UserId::generate();
        $attempt = $this->attemptOf($owner, Documents::fight());

        self::assertTrue($attempt->belongsTo($owner));
        self::assertFalse($attempt->belongsTo(UserId::generate()));
    }

    /**
     * @param array<mixed> $document
     */
    private function attemptOf(UserId $owner, array $document): Attempt
    {
        $attempt = Attempt::fromDocument($owner, $document);
        self::assertNotNull($attempt);

        return $attempt;
    }
}
