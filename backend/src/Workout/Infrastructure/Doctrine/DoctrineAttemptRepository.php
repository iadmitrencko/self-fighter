<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptFilter;
use App\Workout\Domain\AttemptId;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\GamePool;
use App\Workout\Domain\Mode;
use App\Workout\Domain\Outcome;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;

final readonly class DoctrineAttemptRepository implements AttemptRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(Attempt $attempt): void
    {
        $this->entityManager->persist($attempt);
    }

    public function find(AttemptId $id): ?Attempt
    {
        return $this->entityManager->find(Attempt::class, $id);
    }

    public function findPage(UserId $owner, AttemptFilter $filter, int $limit, ?Attempt $after = null): array
    {
        $query = $this->filtered($owner, $filter)
            ->orderBy('a.finishedAt', 'DESC')
            ->addOrderBy('a.id', 'DESC')
            ->setMaxResults($limit);

        if (null !== $after) {
            $query
                ->andWhere('a.finishedAt < :afterFinishedAt OR (a.finishedAt = :afterFinishedAt AND a.id < :afterId)')
                ->setParameter('afterFinishedAt', $after->finishedAt())
                ->setParameter('afterId', $after->id(), AttemptIdType::NAME);
        }

        return self::attempts($query->getQuery()->getResult());
    }

    public function findAllOf(UserId $owner): array
    {
        return $this->entityManager->getRepository(Attempt::class)->findBy(['owner' => $owner], ['finishedAt' => 'ASC', 'id' => 'ASC']);
    }

    public function countByOutcome(UserId $owner, AttemptFilter $filter): array
    {
        $rows = $this->filtered($owner, $filter)
            ->select('a.outcome AS outcome, COUNT(a.id) AS total')
            ->groupBy('a.outcome')
            ->getQuery()
            ->getArrayResult();
        $counts = [];

        foreach ($rows as $row) {
            $outcome = $row['outcome'] instanceof Outcome ? $row['outcome'] : Outcome::from((string) $row['outcome']);
            $counts[$outcome->value] = (int) $row['total'];
        }

        return $counts;
    }

    public function passedLevels(UserId $owner): array
    {
        $levels = $this->filtered($owner, new AttemptFilter(Mode::Campaign, Outcome::Win))
            ->select('DISTINCT a.level')
            ->andWhere('a.level IS NOT NULL')
            ->orderBy('a.level')
            ->getQuery()
            ->getSingleColumnResult();

        return array_values(array_filter($levels, 'is_string'));
    }

    // Every battle moves the moment later, so the latest one has seen them all.
    public function energyFullAt(UserId $owner, GamePool $pool): ?\DateTimeImmutable
    {
        $latest = $this->filtered($owner, new AttemptFilter(pool: $pool))
            ->select('MAX(a.energyFullAt)')
            ->getQuery()
            ->getSingleScalarResult();

        return \is_string($latest) ? new \DateTimeImmutable($latest, new \DateTimeZone('UTC')) : null;
    }

    public function transfer(UserId $from, UserId $to): void
    {
        $this->entityManager
            ->createQuery('UPDATE App\Workout\Domain\Attempt a SET a.owner = :to WHERE a.owner = :from')
            ->setParameter('to', $to, UserIdType::NAME)
            ->setParameter('from', $from, UserIdType::NAME)
            ->execute();
    }

    public function removeAllOf(UserId $owner): void
    {
        $this->entityManager
            ->createQuery('DELETE FROM App\Workout\Domain\Attempt a WHERE a.owner = :owner')
            ->setParameter('owner', $owner, UserIdType::NAME)
            ->execute();
    }

    private function filtered(UserId $owner, AttemptFilter $filter): QueryBuilder
    {
        $query = $this->entityManager->createQueryBuilder()
            ->select('a')
            ->from(Attempt::class, 'a')
            ->where('a.owner = :owner')
            ->setParameter('owner', $owner, UserIdType::NAME);

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
        if (null !== $filter->pool) {
            $query->andWhere('a.pool = :pool')->setParameter('pool', $filter->pool->value);
        }

        return $query;
    }

    /**
     * @return list<Attempt>
     */
    private static function attempts(mixed $result): array
    {
        return \is_array($result) ? array_values(array_filter($result, static fn (mixed $item): bool => $item instanceof Attempt)) : [];
    }
}
