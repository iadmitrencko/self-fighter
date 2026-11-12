<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Domain;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventId;
use PHPUnit\Framework\TestCase;

final class EventTest extends TestCase
{
    public function testNeedsAKnownNameAndAMode(): void
    {
        $now = new \DateTimeImmutable();

        self::assertNull(Event::record(EventId::generate(), ['name' => 'page_viewed', 'mode' => 'target'], null, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started'], null, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started', 'mode' => 42], null, $now));
    }
}
