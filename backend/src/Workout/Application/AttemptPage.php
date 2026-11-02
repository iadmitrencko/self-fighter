<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\Attempt;

final readonly class AttemptPage
{
    /**
     * @param list<Attempt> $attempts the newest first
     * @param Attempt|null  $last     the attempt the next page starts after, or null on the last page
     */
    public function __construct(
        public array $attempts,
        public ?Attempt $last,
    ) {
    }
}
