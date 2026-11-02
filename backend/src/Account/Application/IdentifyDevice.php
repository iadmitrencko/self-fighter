<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\DeviceToken;

final readonly class IdentifyDevice
{
    public function __construct(private DeviceRepository $devices)
    {
    }

    public function __invoke(DeviceToken $token): ?Device
    {
        return $this->devices->findByToken($token);
    }
}
