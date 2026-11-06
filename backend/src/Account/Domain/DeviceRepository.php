<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface DeviceRepository
{
    public function add(Device $device): void;

    public function findByToken(DeviceToken $token): ?Device;

    /**
     * The browsers that lead to the user or keep it as their guest.
     *
     * @return list<Device>
     */
    public function findUsedBy(UserId $user): array;

    // Saves the time from Device::markSeen().
    public function saveLastSeen(Device $device): void;

    public function remove(Device $device): void;

    /**
     * @return int the number of removed devices
     */
    public function removeNotSeenSince(\DateTimeImmutable $cutoff): int;
}
