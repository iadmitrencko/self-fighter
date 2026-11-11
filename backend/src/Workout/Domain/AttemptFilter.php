<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * History filters (§14.3). The period includes its start and excludes its end. The game counts
 * its battles by their pool of energy (§24).
 */
final readonly class AttemptFilter
{
    public function __construct(
        public ?Mode $mode = null,
        public ?Outcome $outcome = null,
        public ?\DateTimeImmutable $from = null,
        public ?\DateTimeImmutable $to = null,
        public ?GamePool $pool = null,
    ) {
    }
}
