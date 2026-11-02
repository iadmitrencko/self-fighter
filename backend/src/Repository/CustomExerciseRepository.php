<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\CustomExercise;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<CustomExercise>
 */
class CustomExerciseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CustomExercise::class);
    }

    /**
     * @return list<CustomExercise>
     */
    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['createdAt' => 'ASC', 'id' => 'ASC']);
    }

    public function findOneForUser(User $user, Uuid $id): ?CustomExercise
    {
        return $this->findOneBy(['id' => $id, 'user' => $user]);
    }

    public function isNameTaken(User $user, string $nameKey, Uuid $exceptId): bool
    {
        $found = $this->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.user = :user AND e.nameKey = :nameKey AND e.id <> :id')
            ->setParameter('user', $user->getId(), 'uuid')
            ->setParameter('nameKey', $nameKey)
            ->setParameter('id', $exceptId, 'uuid')
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $found > 0;
    }
}
