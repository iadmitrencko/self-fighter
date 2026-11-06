<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\DeviceToken;
use App\Account\Domain\IdentityRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use Psr\Clock\ClockInterface;

/**
 * §23.2: after signing out the data of the account is out of reach on this browser. The browser
 * goes back to its guest with a new token, or to no user at all.
 */
final readonly class SignOut
{
    public function __construct(
        private IdentityRepository $identities,
        private DeviceRepository $devices,
        private UserTransaction $userTransaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @return DeviceToken|null the new token of the browser, or null when it has no user left
     *
     * @throws Refusal when a guest signs out: it would lose the only way to its data
     */
    public function __invoke(Device $device): ?DeviceToken
    {
        $account = $device->owner();

        if (!$this->identities->existsFor($account)) {
            throw Refusal::conflict('not-signed-in');
        }

        return $this->userTransaction->run($account, function () use ($device): ?DeviceToken {
            $token = DeviceToken::generate();

            if ($device->signOut($token, $this->clock->now())) {
                return $token;
            }
            $this->devices->remove($device);

            return null;
        });
    }
}
