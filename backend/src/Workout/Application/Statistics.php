<?php

declare(strict_types=1);

namespace App\Workout\Application;

// The total always equals wins plus draws plus losses (§14.2).
final readonly class Statistics
{
    public function __construct(
        public int $total,
        public int $wins,
        public int $draws,
        public int $losses,
    ) {
    }
}
