<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Domain;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventId;
use PHPUnit\Framework\TestCase;

final class EventTest extends TestCase
{
    // §15.5: the export shows an event with the fields it has and the time the server took.
    public function testDescribesItselfWithItsOwnFieldsOnly(): void
    {
        $occurredAt = new \DateTimeImmutable('2026-11-03 10:00:00', new \DateTimeZone('UTC'));

        self::assertSame(
            ['name' => 'setup_error', 'mode' => 'ladder', 'error' => 'ladder-max-invalid', 'occurredAt' => '2026-11-03T10:00:00.000Z'],
            Event::record(EventId::generate(), ['name' => 'setup_error', 'mode' => 'ladder', 'error' => 'ladder-max-invalid'], null, $occurredAt)?->describe(),
        );
        self::assertSame(
            ['name' => 'workout_completed', 'mode' => 'target', 'outcome' => 'draw', 'occurredAt' => '2026-11-03T10:00:00.000Z'],
            Event::record(EventId::generate(), ['name' => 'workout_completed', 'mode' => 'target', 'outcome' => 'draw'], null, $occurredAt)?->describe(),
        );
    }

    public function testNeedsAKnownNameAndAMode(): void
    {
        $now = new \DateTimeImmutable();

        self::assertNull(Event::record(EventId::generate(), ['name' => 'page_viewed', 'mode' => 'target'], null, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started'], null, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started', 'mode' => 42], null, $now));
    }
}
