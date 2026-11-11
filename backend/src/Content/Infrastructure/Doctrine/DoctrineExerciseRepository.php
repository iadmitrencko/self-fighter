<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Doctrine;

use App\Content\Domain\Exercise;
use App\Content\Domain\ExerciseRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineExerciseRepository implements ExerciseRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function replaceAll(array $exercises): void
    {
        $this->entityManager->createQuery('DELETE FROM App\Content\Domain\Exercise e')->execute();

        foreach ($exercises as $exercise) {
            $this->entityManager->persist($exercise);
        }
    }

    public function all(): array
    {
        return $this->entityManager->getRepository(Exercise::class)->findBy([], ['position' => 'ASC', 'slug' => 'ASC']);
    }
}
