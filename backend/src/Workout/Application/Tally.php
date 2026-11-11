<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\Outcome;

// Wins, draws and losses of a kind of battle.
final readonly class Tally
{
    public function __construct(
        public int $wins,
        public int $draws,
        public int $losses,
    ) {
    }

    /**
     * @param array<string, int> $counts the number of attempts for each outcome
     */
    public static function of(array $counts): self
    {
        return new self($counts[Outcome::Win->value] ?? 0, $counts[Outcome::Draw->value] ?? 0, $counts[Outcome::Loss->value] ?? 0);
    }
}
