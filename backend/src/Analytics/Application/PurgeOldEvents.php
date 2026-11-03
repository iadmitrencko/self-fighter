<?php

declare(strict_types=1);

namespace App\Analytics\Application;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventRepository;
use Psr\Clock\ClockInterface;

/**
 * Runs daily together with the purge of guests (stage 10 of the plan).
 */
final readonly class PurgeOldEvents
{
    public function __construct(
        private EventRepository $events,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @return int the number of events removed
     */
    public function __invoke(): int
    {
        return $this->events->removeOlderThan($this->clock->now()->modify(\sprintf('-%d months', Event::RETENTION_MONTHS)));
    }
}
