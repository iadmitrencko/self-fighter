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
 * Opens the account of a person on this browser (§23.2). A way to sign in used for the first time
 * creates the account, a known one opens its account. The game needs an account, so nobody plays
 * before this (§23.1).
 */
final readonly class SignIn
{
    public function __construct(
        private UserRepository $users,
        private IdentityRepository $identities,
        private DeviceRepository $devices,
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

            if (null === $linked) {
                $this->createAccount($identity, $device, $token);
            } else {
                $this->openAccount($linked->user(), $identity, $device, $token);
            }
        });

        return $token;
    }

    private function openAccount(UserId $account, ExternalIdentity $identity, ?Device $device, DeviceToken $token): void
    {
        $this->userTransaction->run($account, function () use ($account, $identity, $device, $token): void {
            $this->users->find($account)?->rememberProfile($identity->email, $identity->name);
            $this->open($account, $device, $token);
        });
    }

    private function createAccount(ExternalIdentity $identity, ?Device $device, DeviceToken $token): void
    {
        $now = $this->clock->now();
        $user = User::signUp(UserId::generate(), $now);
        $user->rememberProfile($identity->email, $identity->name);
        $this->users->add($user);
        $this->identities->add(Identity::link($identity->provider, $identity->subject, $user->id(), $now));
        $this->open($user->id(), $device, $token);
    }

    // A browser that had another account open now leads to this one.
    private function open(UserId $account, ?Device $device, DeviceToken $token): void
    {
        $now = $this->clock->now();

        if (null === $device) {
            $this->devices->add(Device::register($account, $token, $now));
        } else {
            $device->signIn($account, $token, $now);
        }
    }
}
