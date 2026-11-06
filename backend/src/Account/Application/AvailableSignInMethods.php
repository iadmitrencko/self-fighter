<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\IdentityProvider;
use App\Shared\Application\SignInMethods;

final readonly class AvailableSignInMethods implements SignInMethods
{
    public function __construct(private GoogleAccounts $google)
    {
    }

    public function available(): array
    {
        return $this->google->isConfigured() ? [IdentityProvider::Google->value] : [];
    }
}
