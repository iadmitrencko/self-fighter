<?php

declare(strict_types=1);

namespace App\Shared\Application;

use App\Shared\Domain\UserId;

/**
 * A transaction over the data of one user. Changes of one user happen one at a time, so two
 * tabs cannot both create the same record, and nothing is written for a user who is gone.
 */
interface UserTransaction
{
    /**
     * @template T
     *
     * @param callable(): T $change
     *
     * @return T
     *
     * @throws Refusal when the user is gone or another user holds a record with the same id
     */
    public function run(UserId $user, callable $change): mixed;
}
