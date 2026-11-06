<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Doctrine;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\DeviceToken;
use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineDeviceRepository implements DeviceRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(Device $device): void
    {
        $this->entityManager->persist($device);
    }

    public function findByToken(DeviceToken $token): ?Device
    {
        return $this->entityManager->getRepository(Device::class)->findOneBy(['tokenHash' => $token->hash()]);
    }

    public function findUsedBy(UserId $user): array
    {
        return $this->entityManager
            ->createQuery('SELECT d FROM App\Account\Domain\Device d WHERE d.owner = :user OR d.guest = :user ORDER BY d.createdAt, d.id')
            ->setParameter('user', $user, UserIdType::NAME)
            ->getResult();
    }

    // A query rather than a flush: it runs at the end of a request, after a failed write may have closed the entity manager.
    public function saveLastSeen(Device $device): void
    {
        $this->entityManager
            ->createQuery('UPDATE App\Account\Domain\Device d SET d.lastSeenAt = :lastSeenAt WHERE d.id = :id')
            ->setParameter('lastSeenAt', $device->lastSeenAt())
            ->setParameter('id', $device->id(), DeviceIdType::NAME)
            ->execute();
    }

    public function remove(Device $device): void
    {
        $this->entityManager->remove($device);
    }

    // The cookie of a device last seen at the cutoff has just expired as well.
    public function removeNotSeenSince(\DateTimeImmutable $cutoff): int
    {
        return $this->entityManager
            ->createQuery('DELETE FROM App\Account\Domain\Device d WHERE d.lastSeenAt <= :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->execute();
    }
}
