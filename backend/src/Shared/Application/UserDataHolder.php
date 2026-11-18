<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Domain\UserId;

/**
 * A module that keeps data of users. Every such module takes part in the deletion, so no data
 * is left behind when a user leaves (§15.5).
 */
interface UserDataHolder
{
    public function erase(UserId $user): void;
}
