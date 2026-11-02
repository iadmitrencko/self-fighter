<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use App\Shared\Domain\UserId;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * The user of a request as Symfony Security keeps it. Controllers receive its UserId instead
 * (UserIdResolver), so the domain never meets the framework.
 */
final readonly class SecurityUser implements UserInterface
{
    public function __construct(public UserId $id)
    {
    }

    public function getUserIdentifier(): string
    {
        return $this->id->value;
    }

    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    // The user has no credentials to erase.
    #[\Deprecated]
    public function eraseCredentials(): void
    {
    }
}
