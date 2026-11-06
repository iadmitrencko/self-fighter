<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Identity;
use App\Account\Domain\IdentityRepository;
use App\Account\Domain\UserRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;
use Psr\Clock\ClockInterface;

/**
 * Everything the application keeps about a user, collected from every module (§15.5).
 */
final readonly class ExportUserData
{
    /**
     * @param iterable<UserDataHolder> $userData
     */
    public function __construct(
        private UserRepository $users,
        private IdentityRepository $identities,
        private iterable $userData,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function __invoke(UserId $id): array
    {
        $user = $this->users->find($id) ?? throw Refusal::userGone();
        $identities = $this->identities->findAllOf($id);
        $export = [
            'exportedAt' => Instant::format($this->clock->now()),
            'user' => UserView::of($user, [] !== $identities),
            // The ways to sign in: the id of the Google account is data about the person too.
            'identities' => array_map(static fn (Identity $identity): array => $identity->describe(), $identities),
        ];

        foreach ($this->userData as $holder) {
            $export = [...$export, ...$holder->export($id)];
        }

        return $export;
    }
}
