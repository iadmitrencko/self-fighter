<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AttemptRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * A finished attempt. It never changes once saved (§17.2), so it has no setters.
 */
#[ORM\Entity(repositoryClass: AttemptRepository::class)]
#[ORM\Index(name: 'idx_attempt_user_finished_at', columns: ['user_id', 'finished_at'])]
#[ORM\Index(name: 'idx_attempt_user_mode_finished_at', columns: ['user_id', 'mode', 'finished_at'])]
#[ORM\Index(name: 'idx_attempt_user_outcome_finished_at', columns: ['user_id', 'outcome', 'finished_at'])]
class Attempt
{
    // The browser creates the id when the attempt starts, so sending it again cannot add a second record.
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 20)]
    private string $mode;

    #[ORM\Column(length: 4)]
    private string $outcome;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $schemaVersion;

    #[ORM\Column]
    private \DateTimeImmutable $finishedAt;

    /**
     * @var array<mixed>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $document;

    /**
     * @param array<mixed> $document the attempt as the browser sent it
     */
    public function __construct(
        Uuid $id,
        User $user,
        Mode $mode,
        Outcome $outcome,
        int $schemaVersion,
        \DateTimeImmutable $finishedAt,
        array $document,
    ) {
        $this->id = $id;
        $this->user = $user;
        $this->mode = $mode->value;
        $this->outcome = $outcome->value;
        $this->schemaVersion = $schemaVersion;
        $this->finishedAt = $finishedAt;
        $this->document = $document;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getFinishedAt(): \DateTimeImmutable
    {
        return $this->finishedAt;
    }

    /**
     * @return array<mixed>
     */
    public function getDocument(): array
    {
        return $this->document;
    }

    public function belongsTo(User $user): bool
    {
        return $this->user->getId()->equals($user->getId());
    }

    /**
     * @param array<mixed> $document
     */
    public function hasDocument(array $document): bool
    {
        return self::canonical($this->document) === self::canonical($document);
    }

    /**
     * MySQL reorders the keys of a JSON object, so only the content may tell two documents apart.
     *
     * @param array<mixed> $value
     *
     * @return array<mixed>
     */
    private static function canonical(array $value): array
    {
        if (!array_is_list($value)) {
            ksort($value, \SORT_STRING);
        }

        return array_map(static fn (mixed $item): mixed => \is_array($item) ? self::canonical($item) : $item, $value);
    }
}
