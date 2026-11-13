<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * §24.4: one pool of energy. A battle takes a unit when it starts, and the units come back one by
 * one, a period each. The state of the pool is the moment it is full again, as in the browser
 * (frontend/src/domain/kozak/energy.ts); the numbers live in backend/schema/energy.json.
 */
final readonly class EnergyRule
{
    public function __construct(public int $max, public int $periodMs)
    {
        if ($max < 1 || $periodMs < 1) {
            throw new \InvalidArgumentException('A pool holds a unit at least, and a unit takes time to come back.');
        }
    }

    /**
     * A battle may start while a unit is left, that is while the pool is full again at most
     * max − 1 periods after the start. The grace forgives clocks that differ a little.
     */
    public function allows(?\DateTimeImmutable $fullAt, \DateTimeImmutable $startedAt, int $graceMs = 0): bool
    {
        return null === $fullAt || self::ms($fullAt) - self::ms($startedAt) - $graceMs <= ($this->max - 1) * $this->periodMs;
    }

    // The battle takes a unit: the pool is full again a period after the start, or after the moment it would be full.
    public function spend(?\DateTimeImmutable $fullAt, \DateTimeImmutable $startedAt): \DateTimeImmutable
    {
        $from = null === $fullAt ? self::ms($startedAt) : max(self::ms($startedAt), self::ms($fullAt));

        return self::time($from + $this->periodMs);
    }

    private static function ms(\DateTimeImmutable $time): int
    {
        return (int) $time->format('Uv');
    }

    private static function time(int $ms): \DateTimeImmutable
    {
        $time = \DateTimeImmutable::createFromFormat('U.v', \sprintf('%d.%03d', intdiv($ms, 1000), $ms % 1000));

        if (false === $time) {
            throw new \LogicException(\sprintf('%d ms is not a time.', $ms));
        }

        return $time;
    }
}
