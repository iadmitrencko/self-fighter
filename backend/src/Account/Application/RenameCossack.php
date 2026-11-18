<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\UserRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;

/**
 * §24.11: the player names the cossack. Without a name of their own the cossack
 * carries the name Google gave.
 */
final readonly class RenameCossack
{
    public function __construct(
        private UserRepository $users,
        private UserTransaction $userTransaction,
    ) {
    }

    /**
     * @throws Refusal when the name is longer than allowed or the user is gone
     */
    public function __invoke(UserId $id, ?string $nickname): void
    {
        $this->userTransaction->run($id, function () use ($id, $nickname): void {
            $user = $this->users->find($id) ?? throw Refusal::userGone();

            if (!$user->rename($nickname)) {
                throw Refusal::invalid('invalid-name');
            }
        });
    }
}
