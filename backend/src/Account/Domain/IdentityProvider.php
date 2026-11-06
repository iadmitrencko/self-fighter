<?php

declare(strict_types=1);

namespace App\Account\Domain;

// The ways to sign in (§23.2). Email and password join them later (§23.4).
enum IdentityProvider: string
{
    case Google = 'google';
}
