<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\User;
use App\Shared\Domain\Instant;

// The account as the browser sees it (CurrentUser in frontend/src/storage/contract.ts).
final class UserView
{
    /**
     * The name and the email Google gave show whose account is open, and the name the player gave
     * the cossack goes with them (§24.11).
     *
     * @return array<string, string|null>
     */
    public static function of(User $user): array
    {
        return [
            'id' => $user->id()->value,
            'createdAt' => Instant::format($user->createdAt()),
            'nickname' => $user->nickname(),
            'name' => $user->name(),
            'email' => $user->email(),
        ];
    }
}
