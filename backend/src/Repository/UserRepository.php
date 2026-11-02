<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * A guest is reachable only through the cookie of its browser. Once no browser holds one,
     * nobody can open its data again. The database deletes the data together with the user.
     */
    public function deleteUnreachableGuests(): int
    {
        return (int) $this->getEntityManager()->getConnection()->executeStatement(
            'DELETE u FROM user u LEFT JOIN device d ON d.user_id = u.id WHERE d.id IS NULL',
        );
    }
}
