<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface IdentityRepository
{
    public function add(Identity $identity): void;

    public function find(IdentityProvider $provider, string $subject): ?Identity;

    // A user with a way to sign in is an account, a user without one is a guest.
    public function existsFor(UserId $user): bool;

    /**
     * @return list<Identity> the oldest first
     */
    public function findAllOf(UserId $user): array;

    public function removeAllOf(UserId $user): void;
}
