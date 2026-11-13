<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * §24.4: the battles of one pool in the order they started. Each one takes a unit, and one that
 * found the pool empty is starved. A battle that waited in the browser may arrive after later
 * ones, so the server replays the battles after it as well.
 */
final readonly class EnergyReplay
{
    /**
     * @param list<\DateTimeImmutable> $fullAt when the pool is full again after each battle
     */
    private function __construct(public array $fullAt, public int $starved)
    {
    }

    /**
     * @param ?\DateTimeImmutable      $fullAt when the pool is full again before the first battle
     * @param list<\DateTimeImmutable> $starts the starts of the battles in their order
     */
    public static function of(EnergyRule $rule, ?\DateTimeImmutable $fullAt, array $starts, int $graceMs = 0): self
    {
        $after = [];
        $starved = 0;

        foreach ($starts as $start) {
            if (!$rule->allows($fullAt, $start, $graceMs)) {
                ++$starved;
            }
            $fullAt = $rule->spend($fullAt, $start);
            $after[] = $fullAt;
        }

        return new self($after, $starved);
    }
}
