<?php

declare(strict_types=1);

namespace App\Analytics\Application;

/**
 * The database counts the numbers itself: which workout of a player came first and how many days
 * passed since it (R5 of the plan).
 */
interface EventMetrics
{
    // The players whose first workout started at $since or later; without it, every player.
    public function collect(?\DateTimeImmutable $since): Metrics;
}
