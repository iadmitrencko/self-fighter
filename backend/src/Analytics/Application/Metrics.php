<?php

declare(strict_types=1);

namespace App\Analytics\Application;

/**
 * The numbers of §19. The players are the users who started their first workout in the period,
 * and each count tells how many of them went further. Only visitors who allowed analytics are in
 * them (§22), so they are a lower bound.
 */
final readonly class Metrics
{
    /**
     * @param list<array{mode: string, started: int, completed: int, players: int}> $modes       the most started first
     * @param list<array{error: string, events: int, players: int}>                 $setupErrors the most frequent first
     */
    public function __construct(
        public int $started,
        public int $completed,
        public int $repeated,
        public int $returned,
        public int $returnedAfterWeek,
        public array $modes,
        public array $setupErrors,
    ) {
    }
}
