<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;

/**
 * What the guest of a browser has that a person would miss, such as attempts and custom
 * exercises (§23.3). Every module that keeps data of users counts its own part.
 */
final readonly class GuestData
{
    /**
     * @param iterable<UserDataHolder> $userData
     */
    public function __construct(private iterable $userData)
    {
    }

    /**
     * @return array<string, int>
     */
    public function summary(UserId $guest): array
    {
        $summary = [];

        foreach ($this->userData as $holder) {
            $summary = [...$summary, ...$holder->summary($guest)];
        }

        return $summary;
    }

    public function isWorthKeeping(UserId $guest): bool
    {
        return array_sum($this->summary($guest)) > 0;
    }
}
