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
     * Users no device leads to any more. Nobody can open their data again.
     *
     * @return list<UserId>
     */
    public function findUnreachable(): array;
}
