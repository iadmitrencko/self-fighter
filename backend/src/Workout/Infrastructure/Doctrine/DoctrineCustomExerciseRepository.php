<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use App\Workout\Domain\CustomExercise;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\ExerciseId;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineCustomExerciseRepository implements CustomExerciseRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(CustomExercise $exercise): void
    {
        $this->entityManager->persist($exercise);
    }

    public function find(ExerciseId $id): ?CustomExercise
    {
        return $this->entityManager->find(CustomExercise::class, $id);
    }

    public function findAllOf(UserId $owner): array
    {
        return $this->entityManager->getRepository(CustomExercise::class)->findBy(['owner' => $owner], ['createdAt' => 'ASC', 'id' => 'ASC']);
    }

    public function isNameTaken(UserId $owner, string $nameKey, ExerciseId $exceptId): bool
    {
        $found = $this->entityManager
            ->createQuery(
                'SELECT COUNT(e.id) FROM App\Workout\Domain\CustomExercise e
                WHERE e.owner = :owner AND e.nameKey = :nameKey AND e.id <> :id',
            )
            ->setParameter('owner', $owner, UserIdType::NAME)
            ->setParameter('nameKey', $nameKey)
            ->setParameter('id', $exceptId, ExerciseIdType::NAME)
            ->getSingleScalarResult();

        return (int) $found > 0;
    }

    public function remove(CustomExercise $exercise): void
    {
        $this->entityManager->remove($exercise);
    }

    public function removeAllOf(UserId $owner): void
    {
        $this->entityManager
            ->createQuery('DELETE FROM App\Workout\Domain\CustomExercise e WHERE e.owner = :owner')
            ->setParameter('owner', $owner, UserIdType::NAME)
            ->execute();
    }
}
