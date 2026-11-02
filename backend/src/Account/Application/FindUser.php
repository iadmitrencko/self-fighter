<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\User;
use App\Account\Domain\UserRepository;
use App\Shared\Domain\UserId;

final readonly class FindUser
{
    public function __construct(private UserRepository $users)
    {
    }

    public function __invoke(UserId $id): ?User
    {
        return $this->users->find($id);
    }
}
