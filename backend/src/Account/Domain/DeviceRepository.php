<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

interface DeviceRepository
{
    public function add(Device $device): void;

    public function findByToken(DeviceToken $token): ?Device;

    // Saves the time from Device::markSeen().
    public function saveLastSeen(Device $device): void;

    public function removeOwnedBy(UserId $owner): void;

    /**
     * @return int the number of removed devices
     */
    public function removeNotSeenSince(\DateTimeImmutable $cutoff): int;
}
