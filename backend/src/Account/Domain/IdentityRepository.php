<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface IdentityRepository
{
    public function add(Identity $identity): void;

    public function find(IdentityProvider $provider, string $subject): ?Identity;

    public function removeAllOf(UserId $user): void;
}
