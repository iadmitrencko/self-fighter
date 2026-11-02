<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceRepository;
use App\Account\Domain\DeviceToken;
use App\Account\Domain\User;
use App\Account\Domain\UserRepository;
use App\Shared\Application\Transaction;
use App\Shared\Domain\UserId;
use Psr\Clock\ClockInterface;

/**
 * Creates the guest of a browser with its first write, so visitors who only look leave nothing behind (§15.1).
 */
final readonly class SignUpGuest
{
    public function __construct(
        private UserRepository $users,
        private DeviceRepository $devices,
        private Transaction $transaction,
        private ClockInterface $clock,
    ) {
    }

    public function __invoke(): NewGuest
    {
        $now = $this->clock->now();
        $user = User::signUpGuest(UserId::generate(), $now);
        $token = DeviceToken::generate();

        $this->transaction->run(function () use ($user, $token, $now): void {
            $this->users->add($user);
            $this->devices->add(Device::register($user->id(), $token, $now));
        });

        return new NewGuest($user, $token);
    }
}
