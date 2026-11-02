<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\UserRepository;
use Psr\Clock\ClockInterface;

/**
 * Runs daily (§15.2). A device unseen for 400 days has lost its cookie, and a guest without
 * devices can never be reached again, so its data goes as well.
 */
final readonly class PurgeAbandonedGuests
{
    public function __construct(
        private DeviceRepository $devices,
        private UserRepository $users,
        private DeleteUser $deleteUser,
        private ClockInterface $clock,
    ) {
    }

    public function __invoke(): PurgeReport
    {
        $cutoff = $this->clock->now()->modify(\sprintf('-%d days', Device::LIFETIME_DAYS));
        $devices = $this->devices->removeNotSeenSince($cutoff);
        $guests = $this->users->findUnreachable();

        foreach ($guests as $guest) {
            ($this->deleteUser)($guest);
        }

        return new PurgeReport($devices, \count($guests));
    }
}
