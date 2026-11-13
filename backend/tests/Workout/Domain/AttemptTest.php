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
        $document = Documents::target('draw', '2026-11-02T10:18:24.051Z');

        $attempt = Attempt::fromDocument(UserId::generate(), $document);

        self::assertNotNull($attempt);
        self::assertSame($document['id'], $attempt->id()->value);
        self::assertEquals(new \DateTimeImmutable('2026-11-02 10:00:00 UTC'), $attempt->startedAt());
        self::assertEquals(new \DateTimeImmutable('2026-11-02 10:18:24.051 UTC'), $attempt->finishedAt());
        self::assertSame($document, $attempt->document());
    }

    // §24.9: a battle of the duel takes the energy of the journey and names its round as a level.
    public function testRemembersTheBattleOfTheDuel(): void
    {
        $duel = $this->attemptOf(UserId::generate(), Documents::duel('final-battle/1/5'));

        self::assertSame(GamePool::Campaign, $duel->pool());
        self::assertSame('final-battle/1/5', $duel->level());
        self::assertNull(Attempt::fromDocument(UserId::generate(), [...Documents::duel(), 'config' => ['mode' => 'duel', 'from' => 0, 'sets' => []]]));
    }

    // §24.4: the server counts the energy of a battle itself and keeps the document as it came.
    public function testTakesTheEnergyTheServerCounted(): void
    {
        $document = Documents::level(energyFullAt: '2026-11-01T00:00:00.000Z');
        $counted = new \DateTimeImmutable('2026-11-02 12:00:00 UTC');

        $attempt = $this->attemptOf(UserId::generate(), $document)->withEnergyFullAt($counted);

        self::assertEquals($counted, $attempt->energyFullAt());
        self::assertSame($document, $attempt->document());
        self::assertSame(GamePool::Campaign, $attempt->pool());
    }

    // §24: the record of the game counts the battles by pool, the levels won and the energy.
    public function testRemembersTheBattleOfTheGame(): void
    {
        $owner = UserId::generate();
        $workout = $this->attemptOf($owner, Documents::target());
        $fight = $this->attemptOf($owner, Documents::target(overrides: ['game' => Documents::game('fight', '2026-11-02T12:00:00.000Z')]));
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
        self::assertNull(Attempt::fromDocument(UserId::generate(), [...Documents::target(), ...$change]));
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function incompleteDocuments(): iterable
    {
        yield 'id' => [['id' => 'attempt-1']];
        yield 'mode' => [['mode' => 'boxing']];
        yield 'outcome' => [['result' => []]];
        yield 'start time' => [['startedAt' => 'this morning']];
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
        $attempt = $this->attemptOf($owner, Documents::target());

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
