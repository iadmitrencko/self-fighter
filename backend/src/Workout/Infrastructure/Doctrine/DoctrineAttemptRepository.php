<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptFilter;
use App\Workout\Domain\AttemptId;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\Battle;
use App\Workout\Domain\GamePool;
use App\Workout\Domain\Mode;
use App\Workout\Domain\Outcome;
use Doctrine\DBAL\Types\Types;
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

    // The sets live in the document of the attempt (backend/schema/attempt.schema.json). A level
    // names the exercise of its campaign once, a battle of the duel names it in every set.
    public function bestSets(UserId $owner): array
    {
        $rows = $this->entityManager->getConnection()->fetchAllKeyValue(
            <<<'SQL'
                SELECT COALESCE(s.set_exercise, a.document->>'$.config.exercise.id') AS exercise, MAX(s.target) AS best
                FROM attempt a,
                    JSON_TABLE(a.document, '$.result.sets[*]' COLUMNS (
                        target INT PATH '$.target',
                        done BOOLEAN PATH '$.done',
                        set_exercise VARCHAR(80) PATH '$.exercise.id'
                    )) s
                WHERE a.user_id = :owner AND a.mode IN (:campaign, :duel) AND s.done
                GROUP BY exercise
                ORDER BY exercise
                SQL,
            ['owner' => $owner, 'campaign' => Mode::Campaign->value, 'duel' => Mode::Duel->value],
            ['owner' => UserIdType::NAME],
        );
        $best = [];

        foreach ($rows as $exercise => $reps) {
            $best[(string) $exercise] = (int) $reps;
        }

        return $best;
    }

    // The place of a set in its round is where its battle started plus its place in the battle.
    public function duelDone(UserId $owner): array
    {
        $rows = $this->entityManager->getConnection()->fetchAllAssociative(
            <<<'SQL'
                SELECT DISTINCT a.level AS round, CAST(a.document->>'$.config.from' AS UNSIGNED) + s.place - 1 AS place
                FROM attempt a,
                    JSON_TABLE(a.document, '$.result.sets[*]' COLUMNS (place FOR ORDINALITY, done BOOLEAN PATH '$.done')) s
                WHERE a.user_id = :owner AND a.mode = :mode AND s.done
                ORDER BY round, place
                SQL,
            ['owner' => $owner, 'mode' => Mode::Duel->value],
            ['owner' => UserIdType::NAME],
        );
        $done = [];

        foreach ($rows as $row) {
            $done[(string) $row['round']][] = (int) $row['place'];
        }

        return $done;
    }

    public function duelAt(UserId $owner): ?\DateTimeImmutable
    {
        $latest = $this->filtered($owner, new AttemptFilter(Mode::Duel))
            ->select('MAX(a.finishedAt)')
            ->getQuery()
            ->getSingleScalarResult();

        return \is_string($latest) ? new \DateTimeImmutable($latest, new \DateTimeZone('UTC')) : null;
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

    public function energyFullAtBefore(UserId $owner, GamePool $pool, Battle $battle): ?\DateTimeImmutable
    {
        $latest = $this->filtered($owner, new AttemptFilter(pool: $pool))
            ->select('MAX(a.energyFullAt)')
            ->andWhere('a.startedAt < :startedAt OR (a.startedAt = :startedAt AND a.id < :id)')
            ->setParameter('startedAt', $battle->startedAt, Types::DATETIME_IMMUTABLE)
            ->setParameter('id', $battle->id, AttemptIdType::NAME)
            ->getQuery()
            ->getSingleScalarResult();

        return \is_string($latest) ? new \DateTimeImmutable($latest, new \DateTimeZone('UTC')) : null;
    }

    public function battles(UserId $owner, GamePool $pool, ?Battle $after = null): array
    {
        $query = $this->filtered($owner, new AttemptFilter(pool: $pool))
            ->select('a.id AS id, a.startedAt AS startedAt, a.energyFullAt AS energyFullAt')
            ->orderBy('a.startedAt')
            ->addOrderBy('a.id');

        if (null !== $after) {
            $query
                ->andWhere('a.startedAt > :startedAt OR (a.startedAt = :startedAt AND a.id > :id)')
                ->setParameter('startedAt', $after->startedAt, Types::DATETIME_IMMUTABLE)
                ->setParameter('id', $after->id, AttemptIdType::NAME);
        }

        return array_values(array_map(
            static fn (array $row): Battle => new Battle(
                $row['id'] instanceof AttemptId ? $row['id'] : AttemptId::fromString((string) $row['id']),
                self::time($row['startedAt']) ?? throw new \UnexpectedValueException('A battle without its start.'),
                self::time($row['energyFullAt']),
            ),
            $query->getQuery()->getArrayResult(),
        ));
    }

    public function recountEnergy(AttemptId $id, \DateTimeImmutable $energyFullAt): void
    {
        $this->entityManager
            ->createQuery('UPDATE App\Workout\Domain\Attempt a SET a.energyFullAt = :energyFullAt WHERE a.id = :id')
            ->setParameter('energyFullAt', $energyFullAt, Types::DATETIME_IMMUTABLE)
            ->setParameter('id', $id, AttemptIdType::NAME)
            ->execute();
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

    // A field picked from an attempt comes converted, a computed one as the text of the database.
    private static function time(mixed $value): ?\DateTimeImmutable
    {
        return match (true) {
            $value instanceof \DateTimeImmutable => $value,
            \is_string($value) => new \DateTimeImmutable($value, new \DateTimeZone('UTC')),
            default => null,
        };
    }

    /**
     * @return list<Attempt>
     */
    private static function attempts(mixed $result): array
    {
        return \is_array($result) ? array_values(array_filter($result, static fn (mixed $item): bool => $item instanceof Attempt)) : [];
    }
}
