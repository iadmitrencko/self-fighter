<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\IdentityRepository;
use App\Account\Domain\UserRepository;

/**
 * Who uses this browser: its user and the guest it keeps while an account is signed in, with what
 * that guest would bring to the account (§23.3). The same shape as frontend/src/storage/payload.ts reads.
 */
final readonly class DescribeBrowser
{
    public function __construct(
        private UserRepository $users,
        private IdentityRepository $identities,
        private GuestData $guestData,
    ) {
    }

    /**
     * @return array{user: array<string, string|null>|null, guest: array<string, string|int>|null}
     */
    public function __invoke(?Device $device): array
    {
        $user = null === $device ? null : $this->users->find($device->owner());

        if (null === $device || null === $user) {
            return ['user' => null, 'guest' => null];
        }
        $guest = $device->guest();

        return [
            'user' => UserView::of($user, $this->identities->existsFor($user->id())),
            'guest' => null === $guest ? null : ['id' => $guest->value, ...$this->guestData->summary($guest)],
        ];
    }
}
