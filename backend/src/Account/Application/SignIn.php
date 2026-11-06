<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\DeviceToken;
use App\Account\Domain\Identity;
use App\Account\Domain\IdentityRepository;
use App\Account\Domain\User;
use App\Account\Domain\UserRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\Transaction;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use Psr\Clock\ClockInterface;

/**
 * Opens the account of a person on this browser (§23.2, §23.3):
 *
 * - a way to sign in used for the first time turns the guest of the browser into the account,
 *   so nothing moves, and a browser without a guest gets a new account;
 * - a known one opens its account. A guest with attempts or custom exercises stays with the
 *   browser until the person decides whether to join it, a guest with nothing to miss joins at once.
 */
final readonly class SignIn
{
    public function __construct(
        private UserRepository $users,
        private IdentityRepository $identities,
        private DeviceRepository $devices,
        private GuestData $guestData,
        private JoinGuest $joinGuest,
        private Transaction $transaction,
        private UserTransaction $userTransaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @param DeviceToken|null $current the token in the cookie of the browser, if it has one
     *
     * @return DeviceToken the new token of the browser: the old one stops working
     *
     * @throws Refusal when the user changed meanwhile, for example in another tab
     */
    public function __invoke(ExternalIdentity $identity, ?DeviceToken $current): DeviceToken
    {
        $token = DeviceToken::generate();

        $this->transaction->run(function () use ($identity, $current, $token): void {
            $device = null === $current ? null : $this->devices->findByToken($current);
            $linked = $this->identities->find($identity->provider, $identity->subject);
            $guest = null === $device ? null : $this->guestOf($device);

            if (null !== $linked) {
                $this->openAccount($linked->user(), $identity, $device, $guest, $token);
            } elseif (null !== $device && null !== $guest) {
                $this->turnIntoAccount($guest, $identity, $device, $token);
            } else {
                $this->createAccount($identity, $device, $token);
            }
        });

        return $token;
    }

    // The user of the browser, when it is a guest.
    private function guestOf(Device $device): ?UserId
    {
        $user = $device->owner();

        return null !== $this->users->find($user) && !$this->identities->existsFor($user) ? $user : null;
    }

    private function openAccount(UserId $account, ExternalIdentity $identity, ?Device $device, ?UserId $guest, DeviceToken $token): void
    {
        $this->userTransaction->run($account, function () use ($account, $identity, $device, $guest, $token): void {
            $now = $this->clock->now();
            $this->users->find($account)?->rememberProfile($identity->email, $identity->name);

            if (null === $device) {
                $this->devices->add(Device::register($account, $token, $now));

                return;
            }

            if (null === $guest) {
                // The same account again or another one: the browser keeps the guest it had.
                $device->signIn($account, $device->guest(), $token, $now);

                return;
            }

            if ($this->guestData->isWorthKeeping($guest)) {
                // The person decides whether to join the guest. Until then it stays with the browser.
                $device->signIn($account, $guest, $token, $now);

                return;
            }

            // Nothing to miss, so nothing to ask: settings and events join the account at once.
            // The browser leaves the guest first, so the guest takes no browser with it.
            $device->signIn($account, null, $token, $now);
            $this->userTransaction->run($guest, fn () => ($this->joinGuest)($guest, $account));
        });
    }

    private function turnIntoAccount(UserId $guest, ExternalIdentity $identity, Device $device, DeviceToken $token): void
    {
        $this->userTransaction->run($guest, function () use ($guest, $identity, $device, $token): void {
            $now = $this->clock->now();
            $this->identities->add(Identity::link($identity->provider, $identity->subject, $guest, $now));
            $this->users->find($guest)?->rememberProfile($identity->email, $identity->name);
            $device->signIn($guest, null, $token, $now);
        });
    }

    private function createAccount(ExternalIdentity $identity, ?Device $device, DeviceToken $token): void
    {
        $now = $this->clock->now();
        $user = User::signUp(UserId::generate(), $now);
        $user->rememberProfile($identity->email, $identity->name);
        $this->users->add($user);
        $this->identities->add(Identity::link($identity->provider, $identity->subject, $user->id(), $now));

        if (null === $device) {
            $this->devices->add(Device::register($user->id(), $token, $now));
        } else {
            // The browser had an account open: its guest, if any, stays with the browser.
            $device->signIn($user->id(), $device->guest(), $token, $now);
        }
    }
}
