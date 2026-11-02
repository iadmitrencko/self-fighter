<?php

declare(strict_types=1);

namespace App\Tests\Shared\Domain;

use App\Shared\Domain\Instant;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class InstantTest extends TestCase
{
    public function testWritesAndReadsTheFormatOfTheBrowser(): void
    {
        $time = Instant::parse('2026-11-02T10:18:24.051Z');

        self::assertNotNull($time);
        self::assertSame('2026-11-02T10:18:24.051Z', Instant::format($time));
        self::assertSame('2026-11-02T10:18:24.051Z', Instant::format($time->setTimezone(new \DateTimeZone('Europe/Kyiv'))));
    }

    #[DataProvider('foreignTimes')]
    public function testRefusesAnythingElse(string $value): void
    {
        self::assertNull(Instant::parse($value));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function foreignTimes(): iterable
    {
        yield 'a date that does not exist' => ['2026-02-30T10:00:00.000Z'];
        yield 'an offset instead of UTC' => ['2026-11-02T12:18:24.000+02:00'];
        yield 'no milliseconds' => ['2026-11-02T10:18:24Z'];
        yield 'a date only' => ['2026-11-02'];
    }
}
