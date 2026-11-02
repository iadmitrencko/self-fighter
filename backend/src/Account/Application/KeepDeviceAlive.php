<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use Psr\Clock\ClockInterface;

/**
 * Notes that the browser is still in use, so neither its cookie nor its guest expires (§15.2).
 */
final readonly class KeepDeviceAlive
{
    public function __construct(
        private DeviceRepository $devices,
        private ClockInterface $clock,
    ) {
    }

    // Tells whether the browser should receive the cookie again with a new expiry.
    public function __invoke(Device $device): bool
    {
        $now = $this->clock->now();

        if (!$device->isDueForRenewal($now)) {
            return false;
        }
        $device->markSeen($now);
        $this->devices->saveLastSeen($device);

        return true;
    }
}
