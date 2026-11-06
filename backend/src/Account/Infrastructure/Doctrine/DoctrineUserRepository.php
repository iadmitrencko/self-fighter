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

    public function findUnreachable(): array
    {
        $users = $this->entityManager
            ->createQuery(
                'SELECT u FROM App\Account\Domain\User u
                WHERE NOT EXISTS (SELECT d.id FROM App\Account\Domain\Device d WHERE d.owner = u.id OR d.guest = u.id)
                AND NOT EXISTS (SELECT i.subject FROM App\Account\Domain\Identity i WHERE i.user = u.id)',
            )
            ->getResult();

        return array_map(static fn (User $user): UserId => $user->id(), $users);
    }
}
