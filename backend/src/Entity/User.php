<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Everyone who has saved something. A guest has no way to sign in, the browser finds it by the device cookie.
 */
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'user')]
class User implements UserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(\DateTimeImmutable $createdAt)
    {
        $this->id = Uuid::v7();
        // The column keeps whole seconds, so the API shows the same time before and after a reload.
        $this->createdAt = $createdAt->setMicrosecond(0);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUserIdentifier(): string
    {
        return $this->id->toRfc4122();
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
