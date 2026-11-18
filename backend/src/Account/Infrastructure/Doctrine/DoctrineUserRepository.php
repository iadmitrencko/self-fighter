<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Doctrine;

use App\Account\Domain\User;
use App\Account\Domain\UserRepository;
use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineUserRepository implements UserRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(User $user): void
    {
        $this->entityManager->persist($user);
    }

    public function find(UserId $id): ?User
    {
        return $this->entityManager->find(User::class, $id);
    }

    public function remove(UserId $id): void
    {
        $this->entityManager
            ->createQuery('DELETE FROM App\Account\Domain\User u WHERE u.id = :id')
            ->setParameter('id', $id, UserIdType::NAME)
            ->execute();
    }
}
