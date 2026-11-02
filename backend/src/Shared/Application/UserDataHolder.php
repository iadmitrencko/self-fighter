<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Domain\UserId;

/**
 * A module that keeps data of users. Every such module takes part in the export and in the
 * deletion, so no data is left behind when a user leaves (§15.5).
 */
interface UserDataHolder
{
    /**
     * @return array<string, mixed> parts of the export, keyed by their names
     */
    public function export(UserId $user): array;

    public function erase(UserId $user): void;
}
