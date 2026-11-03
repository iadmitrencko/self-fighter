<?php

declare(strict_types=1);

namespace App\Analytics\Presentation\Console;

use App\Analytics\Application\PurgeOldEvents;
use App\Analytics\Domain\Event;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:events:purge', description: 'Deletes the analytics events older than 12 months')]
final readonly class PurgeEventsCommand
{
    public function __construct(private PurgeOldEvents $purgeOldEvents)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $io->success(\sprintf(
            'Deleted %d events older than %d months.',
            ($this->purgeOldEvents)(),
            Event::RETENTION_MONTHS,
        ));

        return Command::SUCCESS;
    }
}
