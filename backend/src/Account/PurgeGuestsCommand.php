<?php

declare(strict_types=1);

namespace App\Account;

use App\Repository\DeviceRepository;
use App\Repository\UserRepository;
use Psr\Clock\ClockInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs daily (§15.2): a cookie unused for 400 days has expired in the browser anyway.
 */
#[AsCommand(name: 'app:guests:purge', description: 'Deletes expired device cookies and the guests nobody can reach any more')]
final readonly class PurgeGuestsCommand
{
    public function __construct(
        private DeviceRepository $devices,
        private UserRepository $users,
        private ClockInterface $clock,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $cutoff = $this->clock->now()->modify(\sprintf('-%d days', DeviceCookie::LIFETIME_DAYS));
        $devices = $this->devices->deleteNotSeenSince($cutoff);
        $guests = $this->users->deleteUnreachableGuests();

        $io->success(\sprintf('Deleted %d expired devices and %d unreachable guests.', $devices, $guests));

        return Command::SUCCESS;
    }
}
