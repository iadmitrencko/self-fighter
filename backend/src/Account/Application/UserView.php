<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\User;
use App\Shared\Domain\Instant;

// The user as the browser sees it (CurrentUser in frontend/src/storage/contract.ts).
final class UserView
{
    /**
     * An account also shows the name and the email Google gave, so the person sees whose account is open.
     *
     * @return array<string, string|null>
     */
    public static function of(User $user, bool $account): array
    {
        $view = [
            'id' => $user->id()->value,
            'kind' => $account ? 'account' : 'guest',
            'createdAt' => Instant::format($user->createdAt()),
        ];

        return $account ? [...$view, 'name' => $user->name(), 'email' => $user->email()] : $view;
    }
}
