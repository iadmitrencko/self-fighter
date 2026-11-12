<?php

declare(strict_types=1);

namespace App\Analytics\Infrastructure\Doctrine;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventRepository;
use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineEventRepository implements EventRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(Event $event): void
    {
        $this->entityManager->persist($event);
    }

    public function forget(UserId $user): void
    {
        $this->entityManager
            ->createQuery('UPDATE App\Analytics\Domain\Event e SET e.user = NULL WHERE e.user = :user')
            ->setParameter('user', $user, UserIdType::NAME)
            ->execute();
    }

    public function transfer(UserId $from, UserId $to): void
    {
        $this->entityManager
            ->createQuery('UPDATE App\Analytics\Domain\Event e SET e.user = :to WHERE e.user = :from')
            ->setParameter('to', $to, UserIdType::NAME)
            ->setParameter('from', $from, UserIdType::NAME)
            ->execute();
    }

    public function removeOlderThan(\DateTimeImmutable $cutoff): int
    {
        return $this->entityManager
            ->createQuery('DELETE FROM App\Analytics\Domain\Event e WHERE e.occurredAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->execute();
    }
}
