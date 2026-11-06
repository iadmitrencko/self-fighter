<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Domain\UserId;

/**
 * A module that keeps data of users. Every such module takes part in the export and in the
 * deletion, so no data is left behind when a user leaves (§15.5), and in joining a guest to an
 * account, so nothing stays behind with the guest (§23.3).
 */
interface UserDataHolder
{
    /**
     * @return array<string, mixed> parts of the export, keyed by their names
     */
    public function export(UserId $user): array;

    public function erase(UserId $user): void;

    /**
     * What a person would miss if it were lost, counted and keyed by its name. The game offers to
     * join a guest to an account only when the guest has something to miss (§23.3).
     *
     * @return array<string, int>
     */
    public function summary(UserId $user): array;

    /**
     * Moves the data of the guest to the account it joins. Records keep their ids, so joining
     * again adds nothing twice, and where both have the same thing the account keeps its own.
     * Runs while both users are locked.
     */
    public function transfer(UserId $guest, UserId $account): void;
}
