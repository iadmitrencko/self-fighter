<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Attempt;
use App\Entity\Outcome;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Attempt>
 */
class AttemptRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Attempt::class);
    }

    public function findOneForUser(User $user, Uuid $id): ?Attempt
    {
        return $this->findOneBy(['id' => $id, 'user' => $user]);
    }

    /**
     * The newest attempts first. The next page starts after the last attempt of the previous one.
     *
     * @return list<Attempt>
     */
    public function findPage(User $user, AttemptFilter $filter, int $limit, ?Attempt $after = null): array
    {
        $query = $this->filtered($user, $filter)
            ->orderBy('a.finishedAt', 'DESC')
            ->addOrderBy('a.id', 'DESC')
            ->setMaxResults($limit);

        if (null !== $after) {
            $query
                ->andWhere('a.finishedAt < :afterFinishedAt OR (a.finishedAt = :afterFinishedAt AND a.id < :afterId)')
                ->setParameter('afterFinishedAt', $after->getFinishedAt())
                ->setParameter('afterId', $after->getId(), 'uuid');
        }

        return $this->attempts($query->getQuery()->getResult());
    }

    /**
     * @return list<Attempt>
     */
    public function findAllForUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['finishedAt' => 'ASC', 'id' => 'ASC']);
    }

    /**
     * Counted from the attempts every time, so the statistics always agree with the history (§14.2).
     *
     * @return array<string, int> the number of attempts for each outcome
     */
    public function countByOutcome(User $user, AttemptFilter $filter): array
    {
        $rows = $this->filtered($user, $filter)
            ->select('a.outcome AS outcome, COUNT(a.id) AS total')
            ->groupBy('a.outcome')
            ->getQuery()
            ->getArrayResult();
        $counts = array_fill_keys(array_column(Outcome::cases(), 'value'), 0);

        foreach ($rows as $row) {
            $counts[Outcome::from((string) $row['outcome'])->value] = (int) $row['total'];
        }

        return $counts;
    }

    private function filtered(User $user, AttemptFilter $filter): QueryBuilder
    {
        $query = $this->createQueryBuilder('a')
            ->where('a.user = :user')
            ->setParameter('user', $user->getId(), 'uuid');

        if (null !== $filter->mode) {
            $query->andWhere('a.mode = :mode')->setParameter('mode', $filter->mode->value);
        }
        if (null !== $filter->outcome) {
            $query->andWhere('a.outcome = :outcome')->setParameter('outcome', $filter->outcome->value);
        }
        if (null !== $filter->from) {
            $query->andWhere('a.finishedAt >= :from')->setParameter('from', $filter->from);
        }
        if (null !== $filter->to) {
            $query->andWhere('a.finishedAt < :to')->setParameter('to', $filter->to);
        }

        return $query;
    }

    /**
     * @return list<Attempt>
     */
    private function attempts(mixed $result): array
    {
        return \is_array($result) ? array_values(array_filter($result, static fn (mixed $item): bool => $item instanceof Attempt)) : [];
    }
}
