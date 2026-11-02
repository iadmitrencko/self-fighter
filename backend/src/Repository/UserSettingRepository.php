<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Mode;
use App\Entity\User;
use App\Entity\UserSetting;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserSetting>
 */
class UserSettingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserSetting::class);
    }

    /**
     * @return list<UserSetting>
     */
    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['name' => 'ASC']);
    }

    public function findOneForUser(User $user, Mode $mode): ?UserSetting
    {
        return $this->findOneBy(['user' => $user, 'name' => $mode->value]);
    }
}
