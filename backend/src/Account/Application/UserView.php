<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\User;
use App\Shared\Domain\Instant;

// The user as the browser sees it (CurrentUser in frontend/src/storage/contract.ts).
final class UserView
{
    /**
     * @return array{id: string, kind: string, createdAt: string}
     */
    public static function of(User $user): array
    {
        return [
            'id' => $user->id()->value,
            'kind' => 'guest',
            'createdAt' => Instant::format($user->createdAt()),
        ];
    }
}
