<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface UserRepository
{
    public function add(User $user): void;

    public function find(UserId $id): ?User;

    public function remove(UserId $id): void;

    /**
     * Guests no browser leads to any more: nobody can open their data again. An account stays,
     * since it can sign in on another browser.
     *
     * @return list<UserId>
     */
    public function findUnreachable(): array;
}
