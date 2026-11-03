<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Doctrine;

use App\Content\Domain\Challenge;
use App\Content\Domain\ChallengeRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineChallengeRepository implements ChallengeRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function replaceAll(array $challenges): void
    {
        $this->entityManager->createQuery('DELETE FROM App\Content\Domain\Challenge c')->execute();

        foreach ($challenges as $challenge) {
            $this->entityManager->persist($challenge);
        }
    }

    public function all(): array
    {
        return $this->entityManager->getRepository(Challenge::class)->findBy([], ['position' => 'ASC', 'slug' => 'ASC']);
    }

    public function find(string $slug): ?Challenge
    {
        return $this->entityManager->find(Challenge::class, $slug);
    }

    // The exercises are a JSON list, and the whole catalog is a few dozen rows.
    public function withExercise(string $exercise): array
    {
        return array_values(array_filter(
            $this->all(),
            static fn (Challenge $challenge): bool => \in_array($exercise, $challenge->exercises(), true),
        ));
    }

    public function ofMode(string $mode): array
    {
        return $this->entityManager->getRepository(Challenge::class)->findBy(['mode' => $mode], ['position' => 'ASC', 'slug' => 'ASC']);
    }
}
