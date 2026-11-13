<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * §24.4: a battle of the game as its pool of energy sees it: when it started and when the pool is
 * full again after it, as the server counted. Battles that started together go by their ids.
 */
final readonly class Battle
{
    public function __construct(
        public AttemptId $id,
        public \DateTimeImmutable $startedAt,
        public ?\DateTimeImmutable $energyFullAt = null,
    ) {
    }
}
