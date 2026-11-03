<?php

declare(strict_types=1);

namespace App\Analytics\Presentation\Console;

use App\Analytics\Application\EventMetrics;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

// The questions of §19 that numbers can answer, in one command (stage 8 of the plan).
#[AsCommand(name: 'app:metrics:report', description: 'Prints the numbers of §19: first workouts, returns, modes and setup errors')]
final readonly class MetricsReportCommand
{
    public function __construct(private EventMetrics $metrics)
    {
    }

    public function __invoke(
        SymfonyStyle $io,
        #[Option('Count the players whose first workout started on this day (YYYY-MM-DD, UTC) or later')]
        ?string $since = null,
    ): int {
        $from = null === $since ? null : \DateTimeImmutable::createFromFormat('!Y-m-d', $since, new \DateTimeZone('UTC'));

        if (false === $from || (null !== $from && $from->format('Y-m-d') !== $since)) {
            $io->error('The --since option takes a day such as 2026-11-01.');

            return Command::INVALID;
        }
        $metrics = $this->metrics->collect($from);

        $io->title(null === $since ? 'All players of the stored events, 12 months at most' : \sprintf('Players whose first workout started on %s or later', $since));
        $io->table(['Players who', 'Count', 'Share'], [
            ['started a first workout', $metrics->started, ''],
            ['completed a workout', $metrics->completed, self::share($metrics->completed, $metrics->started)],
            ['repeated a workout', $metrics->repeated, self::share($metrics->repeated, $metrics->started)],
            ['came back on another day', $metrics->returned, self::share($metrics->returned, $metrics->started)],
            ['came back a week later or more', $metrics->returnedAfterWeek, self::share($metrics->returnedAfterWeek, $metrics->started)],
        ]);

        $io->section('Modes');
        $io->table(['Mode', 'Starts', 'Completions', 'Players'], array_map(array_values(...), $metrics->modes));

        $io->section('Setup errors');
        $io->table(['Error', 'Events', 'Players'], array_map(array_values(...), $metrics->setupErrors));

        $io->note([
            'Only visitors who allowed analytics are counted (§22), so every number is a lower bound.',
            'Whether players find the game interesting enough to come back takes conversations with them (§19).',
        ]);

        return Command::SUCCESS;
    }

    private static function share(int $part, int $whole): string
    {
        return 0 === $whole ? '–' : \sprintf('%d%%', round(100 * $part / $whole));
    }
}
