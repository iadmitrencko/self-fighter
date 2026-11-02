<?php

declare(strict_types=1);

namespace App\Tests\Shared\Domain;

use App\Shared\Domain\UserId;
use App\Workout\Domain\AttemptId;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class Uuid7Test extends TestCase
{
    public function testGeneratesVersion7WithTheTimeFirst(): void
    {
        $before = (int) floor(microtime(true) * 1000);
        $id = UserId::generate();
        $after = (int) floor(microtime(true) * 1000);

        self::assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id->value);
        self::assertGreaterThanOrEqual($before, hexdec(substr(str_replace('-', '', $id->value), 0, 12)));
        self::assertLessThanOrEqual($after, hexdec(substr(str_replace('-', '', $id->value), 0, 12)));
    }

    public function testSurvivesTheWayThroughBytes(): void
    {
        $id = UserId::generate();

        self::assertSame(16, \strlen($id->toBytes()));
        self::assertTrue(UserId::fromBytes($id->toBytes())->equals($id));
    }

    // The ids of the browser come from frontend/src/storage/ids.ts and must keep this exact form.
    #[DataProvider('foreignForms')]
    public function testRefusesAnyOtherForm(string $value): void
    {
        self::assertNull(UserId::tryFrom($value));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function foreignForms(): iterable
    {
        yield 'version 4' => ['6f9619ff-8b86-4011-b42d-00cf4fc964ff'];
        yield 'capital letters' => ['01A19C00-0000-7000-8000-0000000000AA'];
        yield 'no hyphens' => ['01a19c0000007000800000000000aaaa'];
        yield 'trailing line break' => ["01a19c00-0000-7000-8000-0000000000aa\n"];
    }

    public function testIdsOfDifferentKindsAreNeverEqual(): void
    {
        $value = UserId::generate()->value;

        self::assertFalse(UserId::fromString($value)->equals(AttemptId::fromString($value)));
        self::assertTrue(UserId::fromString($value)->equals(UserId::fromString($value)));
    }
}
