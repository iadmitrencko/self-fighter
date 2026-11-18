<?php

declare(strict_types=1);

namespace App\Account\Presentation\Console;

use App\Account\Application\PurgeExpiredDevices;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:devices:purge', description: 'Deletes the devices whose cookie has expired')]
final readonly class PurgeDevicesCommand
{
    public function __construct(private PurgeExpiredDevices $purgeExpiredDevices)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $io->success(\sprintf('Deleted %d expired devices.', ($this->purgeExpiredDevices)()));

        return Command::SUCCESS;
    }
}
