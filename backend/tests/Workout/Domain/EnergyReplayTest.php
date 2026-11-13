<?php

declare(strict_types=1);

namespace App\Tests\Workout\Domain;

use App\Workout\Domain\EnergyReplay;
use App\Workout\Domain\EnergyRule;
use PHPUnit\Framework\TestCase;

final class EnergyReplayTest extends TestCase
{
    private const int HOUR_MS = 3_600_000;

    // §24.4: every battle takes a unit and moves the moment the pool is full again by a period.
    public function testCountsTheBattlesInTheOrderTheyStarted(): void
    {
        $replay = EnergyReplay::of(new EnergyRule(2, 2 * self::HOUR_MS), null, [self::at('10:00'), self::at('10:00'), self::at('11:00')]);

        self::assertEquals([self::at('12:00'), self::at('14:00'), self::at('16:00')], $replay->fullAt);
        // Two units for three battles in an hour: the third found the pool empty.
        self::assertSame(1, $replay->starved);
    }

    public function testStartsFromThePoolTheEarlierBattlesLeft(): void
    {
        $replay = EnergyReplay::of(new EnergyRule(2, 2 * self::HOUR_MS), self::at('13:00'), [self::at('12:00')]);

        self::assertEquals([self::at('15:00')], $replay->fullAt);
        self::assertSame(0, $replay->starved);
    }

    // Two devices may differ a little, so the server forgives a battle that starts a moment early.
    public function testForgivesAClockAMomentAhead(): void
    {
        $rule = new EnergyRule(1, 2 * self::HOUR_MS);

        self::assertFalse($rule->allows(self::at('12:00:30'), self::at('12:00')));
        self::assertTrue($rule->allows(self::at('12:00:30'), self::at('12:00'), 60_000));
        self::assertSame(1, EnergyReplay::of($rule, self::at('12:01:01'), [self::at('12:00')], 60_000)->starved);
    }

    public function testKnowsNoPoolWithoutUnits(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new EnergyRule(0, self::HOUR_MS);
    }

    private static function at(string $time): \DateTimeImmutable
    {
        return new \DateTimeImmutable('2026-11-02 '.$time.' UTC');
    }
}
