<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\UserRepository;
use App\Shared\Application\UserTransaction;

/**
 * §23.3: the person agreed to join the guest of this browser to the account. Asking again changes
 * nothing: the guest is gone after the first time, and its records kept their ids.
 */
final readonly class MergeGuest
{
    public function __construct(
        private UserRepository $users,
        private JoinGuest $joinGuest,
        private UserTransaction $userTransaction,
    ) {
    }

    public function __invoke(Device $device): void
    {
        $guest = $device->guest();

        if (null === $guest) {
            return;
        }
        $account = $device->owner();

        $this->userTransaction->run($account, function () use ($device, $guest, $account): void {
            // Another tab may have joined it a moment ago.
            if (null !== $this->users->find($guest)) {
                $this->userTransaction->run($guest, fn () => ($this->joinGuest)($guest, $account));
            }
            $device->forgetGuest();
        });
    }
}
