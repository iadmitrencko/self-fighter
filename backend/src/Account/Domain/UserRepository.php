<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface UserRepository
{
    public function add(User $user): void;

    public function find(UserId $id): ?User;

    public function remove(UserId $id): void;
}
