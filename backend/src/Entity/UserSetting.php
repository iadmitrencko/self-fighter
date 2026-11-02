<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserSettingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * The last configuration of a mode, so the next workout starts from it.
 */
#[ORM\Entity(repositoryClass: UserSettingRepository::class)]
class UserSetting
{
    #[ORM\Id]
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Id]
    #[ORM\Column(length: 32)]
    private string $name;

    /**
     * @var array<mixed>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $value;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * @param array<mixed> $value
     */
    public function __construct(User $user, Mode $mode, array $value, \DateTimeImmutable $now)
    {
        $this->user = $user;
        $this->name = $mode->value;
        $this->change($value, $now);
    }

    /**
     * @param array<mixed> $value
     */
    public function change(array $value, \DateTimeImmutable $now): void
    {
        $this->value = $value;
        $this->updatedAt = $now;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @return array<mixed>
     */
    public function getValue(): array
    {
        return $this->value;
    }
}
