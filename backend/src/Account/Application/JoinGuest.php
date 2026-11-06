<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\DeviceRepository;
use App\Account\Domain\UserRepository;
use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;

/**
 * §23.3: every module moves the data of the guest to the account, and the guest is gone. The
 * caller holds the locks of both users, so nothing reaches the guest meanwhile.
 */
final readonly class JoinGuest
{
    /**
     * @param iterable<UserDataHolder> $userData
     */
    public function __construct(
        private iterable $userData,
        private DeviceRepository $devices,
        private UserRepository $users,
    ) {
    }

    public function __invoke(UserId $guest, UserId $account): void
    {
        foreach ($this->userData as $holder) {
            $holder->transfer($guest, $account);
        }

        foreach ($this->devices->findUsedBy($guest) as $device) {
            if ($device->owner()->equals($guest)) {
                $this->devices->remove($device);
            } else {
                $device->forgetGuest();
            }
        }

        $this->users->remove($guest);
    }
}
