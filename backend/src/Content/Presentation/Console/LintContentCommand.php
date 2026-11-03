<?php

declare(strict_types=1);

namespace App\Content\Presentation\Console;

use App\Content\Application\ContentRules;
use App\Content\Application\ContentSource;
use App\Content\Application\InvalidContent;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

// Part of make lint: the content of Git must be ready for app:content:sync (section 6.6 of the plan).
#[AsCommand(name: 'app:content:lint', description: 'Checks the content of backend/content: format, links, repeated titles and near-duplicate texts')]
final readonly class LintContentCommand
{
    public function __construct(private ContentSource $source, private ContentRules $rules)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        try {
            $content = $this->source->read();
        } catch (InvalidContent $invalid) {
            $io->error($invalid->problems);

            return Command::FAILURE;
        }
        $problems = $this->rules->problems($content);

        if ([] !== $problems) {
            $io->error($problems);

            return Command::FAILURE;
        }
        $items = [...$content->exercises, ...$content->pages, ...$content->challenges];
        $indexable = array_filter($items, static fn ($item): bool => $item->indexable());
        $withoutText = array_filter($content->challenges, static fn ($challenge): bool => '' === $challenge->note());

        $io->success(\sprintf(
            'The content is fine. %d of %d pages can be indexed, %d challenges have no text of their own yet.',
            \count($indexable),
            \count($items),
            \count($withoutText),
        ));

        return Command::SUCCESS;
    }
}
