<?php

declare(strict_types=1);

namespace App\Analytics\Application;

use App\Analytics\Domain\EventRepository;
use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;

/**
 * The part of the deletion of an account that its events make up (§15.5).
 */
final readonly class AnalyticsData implements UserDataHolder
{
    public function __construct(private EventRepository $events)
    {
    }

    // The events stay in the numbers of §19 without the user (section 3.7 of the plan).
    public function erase(UserId $user): void
    {
        $this->events->forget($user);
    }
}
