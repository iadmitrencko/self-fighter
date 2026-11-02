<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Device;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Device>
 */
class DeviceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Device::class);
    }

    public function findOneByTokenHash(string $tokenHash): ?Device
    {
        $device = $this->createQueryBuilder('d')
            ->addSelect('u')
            ->join('d.user', 'u')
            ->where('d.tokenHash = :tokenHash')
            ->setParameter('tokenHash', $tokenHash)
            ->getQuery()
            ->getOneOrNullResult();

        return $device instanceof Device ? $device : null;
    }

    // A query rather than a flush: it must work even after a failed request closed the entity manager.
    public function markSeen(Device $device, \DateTimeImmutable $now): void
    {
        $this->createQueryBuilder('d')
            ->update()
            ->set('d.lastSeenAt', ':now')
            ->where('d.id = :id')
            ->setParameter('now', $now)
            ->setParameter('id', $device->getId(), 'uuid')
            ->getQuery()
            ->execute();
    }

    // The cookie of a device last seen at the cutoff has just expired as well.
    public function deleteNotSeenSince(\DateTimeImmutable $cutoff): int
    {
        return $this->createQueryBuilder('d')
            ->delete()
            ->where('d.lastSeenAt <= :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }
}
