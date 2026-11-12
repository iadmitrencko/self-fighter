<?php

declare(strict_types=1);

namespace App\Analytics\Domain;

use App\Shared\Domain\UserId;

interface EventRepository
{
    public function add(Event $event): void;

    // The events stay in the numbers of §19, but none of them leads to the user any more (§15.5).
    public function forget(UserId $user): void;

    public function transfer(UserId $from, UserId $to): void;

    /**
     * @return int the number of events removed
     */
    public function removeOlderThan(\DateTimeImmutable $cutoff): int;
}
