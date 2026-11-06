<?php

declare(strict_types=1);

namespace App\Analytics\Application;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventRepository;
use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;

/**
 * The part of the export, the deletion and the joining of a guest to an account that the events
 * of a user make up (§15.5, §23.3).
 */
final readonly class AnalyticsData implements UserDataHolder
{
    public function __construct(private EventRepository $events)
    {
    }

    public function export(UserId $user): array
    {
        return ['events' => array_map(static fn (Event $event): array => $event->describe(), $this->events->findAllOf($user))];
    }

    // The events stay in the numbers of §19 without the user (section 3.7 of the plan).
    public function erase(UserId $user): void
    {
        $this->events->forget($user);
    }

    // Nobody misses an event, so they never make a guest worth joining.
    public function summary(UserId $user): array
    {
        return [];
    }

    // The guest and the account are one player, and §19 counts them as one.
    public function transfer(UserId $guest, UserId $account): void
    {
        $this->events->transfer($guest, $account);
    }
}
