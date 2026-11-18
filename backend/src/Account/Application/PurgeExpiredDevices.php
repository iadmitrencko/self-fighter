<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use Psr\Clock\ClockInterface;

/**
 * Runs daily (§15.2). A device unseen for 400 days has lost its cookie, so it goes. The account
 * stays: its person signs in again on any browser.
 */
final readonly class PurgeExpiredDevices
{
    public function __construct(
        private DeviceRepository $devices,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @return int the number of devices removed
     */
    public function __invoke(): int
    {
        $cutoff = $this->clock->now()->modify(\sprintf('-%d days', Device::LIFETIME_DAYS));

        return $this->devices->removeNotSeenSince($cutoff);
    }
}
