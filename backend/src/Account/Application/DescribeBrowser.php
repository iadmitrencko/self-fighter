<?php

declare(strict_types=1);

namespace App\Account\Application;

use App\Account\Domain\Device;
use App\Account\Domain\UserRepository;

/**
 * The account open in this browser, or none: then the game asks to sign in (§23.1). The same shape
 * as frontend/src/storage/payload.ts reads.
 */
final readonly class DescribeBrowser
{
    public function __construct(private UserRepository $users)
    {
    }

    /**
     * @return array{user: array<string, string|null>|null}
     */
    public function __invoke(?Device $device): array
    {
        $user = null === $device ? null : $this->users->find($device->owner());

        return ['user' => null === $user ? null : UserView::of($user)];
    }
}
