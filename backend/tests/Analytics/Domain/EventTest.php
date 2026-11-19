<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Domain;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventId;
use App\Shared\Domain\UserId;
use PHPUnit\Framework\TestCase;

final class EventTest extends TestCase
{
    public function testNeedsAKnownNameAndAMode(): void
    {
        $now = new \DateTimeImmutable();
        $user = UserId::generate();

        self::assertNull(Event::record(EventId::generate(), ['name' => 'page_viewed', 'mode' => 'fight'], $user, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started'], $user, $now));
        self::assertNull(Event::record(EventId::generate(), ['name' => 'workout_started', 'mode' => 42], $user, $now));
    }
}
