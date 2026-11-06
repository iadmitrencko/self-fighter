<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Doctrine;

use App\Account\Domain\Identity;
use App\Account\Domain\IdentityProvider;
use App\Account\Domain\IdentityRepository;
use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineIdentityRepository implements IdentityRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(Identity $identity): void
    {
        $this->entityManager->persist($identity);
    }

    public function find(IdentityProvider $provider, string $subject): ?Identity
    {
        return $this->entityManager->find(Identity::class, ['provider' => $provider->value, 'subject' => $subject]);
    }

    public function existsFor(UserId $user): bool
    {
        $found = $this->entityManager
            ->createQuery('SELECT COUNT(i.subject) FROM App\Account\Domain\Identity i WHERE i.user = :user')
            ->setParameter('user', $user, UserIdType::NAME)
            ->getSingleScalarResult();

        return (int) $found > 0;
    }

    public function findAllOf(UserId $user): array
    {
        return $this->entityManager->getRepository(Identity::class)->findBy(['user' => $user], ['createdAt' => 'ASC', 'subject' => 'ASC']);
    }

    public function removeAllOf(UserId $user): void
    {
        $this->entityManager
            ->createQuery('DELETE FROM App\Account\Domain\Identity i WHERE i.user = :user')
            ->setParameter('user', $user, UserIdType::NAME)
            ->execute();
    }
}
