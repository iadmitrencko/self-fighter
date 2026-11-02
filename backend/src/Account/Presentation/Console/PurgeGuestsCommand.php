<?php

declare(strict_types=1);

namespace App\Account\Presentation\Console;

use App\Account\Application\PurgeAbandonedGuests;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:guests:purge', description: 'Deletes expired device cookies and the guests nobody can reach any more')]
final readonly class PurgeGuestsCommand
{
    public function __construct(private PurgeAbandonedGuests $purgeAbandonedGuests)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $report = ($this->purgeAbandonedGuests)();

        $io->success(\sprintf(
            'Deleted %d expired devices and %d unreachable guests.',
            $report->devices,
            $report->guests,
        ));

        return Command::SUCCESS;
    }
}
