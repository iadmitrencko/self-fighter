<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\DeviceRepository;
use App\Account\Domain\IdentityRepository;
use App\Account\Domain\UserRepository;
use App\Shared\Application\UserDataHolder;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;

/**
 * Deletes the user with the data every module keeps about it, and an account with its ways to
 * sign in (§15.5). A browser that kept its guest while the account was open goes back to that guest.
 */
final readonly class DeleteUser
{
    /**
     * @param iterable<UserDataHolder> $userData
     */
    public function __construct(
        private UserRepository $users,
        private IdentityRepository $identities,
        private DeviceRepository $devices,
        private iterable $userData,
        private UserTransaction $transaction,
    ) {
    }

    public function __invoke(UserId $id): void
    {
        $this->transaction->run($id, function () use ($id): void {
            foreach ($this->userData as $holder) {
                $holder->erase($id);
            }
            $this->identities->removeAllOf($id);

            foreach ($this->devices->findUsedBy($id) as $device) {
                if (!$device->owner()->equals($id)) {
                    $device->forgetGuest();
                } elseif (!$device->fallBackToGuest()) {
                    $this->devices->remove($device);
                }
            }
            $this->users->remove($id);
        });
    }
}
