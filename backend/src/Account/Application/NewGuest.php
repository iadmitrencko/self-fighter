<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\DeviceToken;
use App\Account\Domain\User;

// The token goes to the browser once and is never stored.
final readonly class NewGuest
{
    public function __construct(
        public User $user,
        public DeviceToken $token,
    ) {
    }
}
