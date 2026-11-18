<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Shared\Application\UserTransaction;

/**
 * §23.2: signing out forgets the browser. Its device goes with the cookie, so the data of the
 * account is out of reach here until the person signs in again.
 */
final readonly class SignOut
{
    public function __construct(
        private DeviceRepository $devices,
        private UserTransaction $userTransaction,
    ) {
    }

    public function __invoke(Device $device): void
    {
        $this->userTransaction->run($device->owner(), fn () => $this->devices->remove($device));
    }
}
