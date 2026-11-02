<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\DeviceRepository;
use App\Account\Domain\UserRepository;
use App\Shared\Application\UserDataHolder;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;

/**
 * Deletes the user with the data every module keeps about it (§15.5).
 */
final readonly class DeleteUser
{
    /**
     * @param iterable<UserDataHolder> $userData
     */
    public function __construct(
        private UserRepository $users,
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
            $this->devices->removeOwnedBy($id);
            $this->users->remove($id);
        });
    }
}
