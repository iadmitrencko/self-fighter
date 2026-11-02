<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CustomExerciseRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * An exercise the user added to the catalog (§5.2). Attempts keep their own copy of its name (§5.3).
 */
#[ORM\Entity(repositoryClass: CustomExerciseRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_custom_exercise_user_name_key', columns: ['user_id', 'name_key'])]
class CustomExercise
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 60)]
    private string $name;

    // Compared byte by byte: the default collation would also treat «ї» and «і» as the same letter.
    #[ORM\Column(length: 255, options: ['collation' => 'utf8mb4_bin'])]
    private string $nameKey;

    #[ORM\Column(length: 200)]
    private string $description;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(Uuid $id, User $user, ExerciseDetails $details, \DateTimeImmutable $now)
    {
        $this->id = $id;
        $this->user = $user;
        $this->createdAt = $now;
        $this->change($details, $now);
    }

    public function change(ExerciseDetails $details, \DateTimeImmutable $now): void
    {
        $this->name = $details->name;
        $this->nameKey = $details->nameKey;
        $this->description = $details->description;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function belongsTo(User $user): bool
    {
        return $this->user->getId()->equals($user->getId());
    }
}
