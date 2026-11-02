<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DeviceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * A browser that holds the device cookie.
 */
#[ORM\Entity(repositoryClass: DeviceRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_device_token_hash', columns: ['token_hash'])]
#[ORM\Index(name: 'idx_device_last_seen_at', columns: ['last_seen_at'])]
class Device
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $id;

    // Only the hash is stored, so a copy of the database cannot sign anyone in.
    #[ORM\Column(length: 64, options: ['fixed' => true])]
    private string $tokenHash;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $lastSeenAt;

    public function __construct(User $user, string $tokenHash, \DateTimeImmutable $now)
    {
        $this->id = Uuid::v7();
        $this->user = $user;
        $this->tokenHash = $tokenHash;
        $this->createdAt = $now;
        $this->lastSeenAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getLastSeenAt(): \DateTimeImmutable
    {
        return $this->lastSeenAt;
    }
}
