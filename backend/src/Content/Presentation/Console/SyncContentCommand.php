<?php

declare(strict_types=1);

namespace App\Content\Presentation\Console;

use App\Content\Application\InvalidContent;
use App\Content\Application\SyncContent;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

// Runs on every deploy after the migrations (section 7 of the plan) and when `make up` starts the project.
#[AsCommand(name: 'app:content:sync', description: 'Copies the content of backend/content into the database')]
final readonly class SyncContentCommand
{
    public function __construct(private SyncContent $sync)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        try {
            $content = ($this->sync)();
        } catch (InvalidContent $invalid) {
            $io->error($invalid->problems);

            return Command::FAILURE;
        }
        $io->success(\sprintf(
            'Synced %d exercises, %d pages and %d challenges.',
            \count($content->exercises),
            \count($content->pages),
            \count($content->challenges),
        ));

        return Command::SUCCESS;
    }
}
