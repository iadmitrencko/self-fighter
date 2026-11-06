<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\IdentityProvider;

/**
 * The person as the provider of the sign-in vouches for them: the id of their account there and
 * what they let the application know (§23.2).
 */
final readonly class ExternalIdentity
{
    public function __construct(
        public IdentityProvider $provider,
        public string $subject,
        // Only an address the provider has confirmed.
        public ?string $email,
        public ?string $name,
    ) {
    }
}
