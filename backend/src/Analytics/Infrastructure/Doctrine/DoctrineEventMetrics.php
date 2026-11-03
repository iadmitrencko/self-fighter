<?php

declare(strict_types=1);

namespace App\Analytics\Infrastructure\Doctrine;

use App\Analytics\Application\EventMetrics;
use App\Analytics\Application\Metrics;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;

/**
 * Days are calendar days in UTC, the time zone of the database.
 */
final readonly class DoctrineEventMetrics implements EventMetrics
{
    // The first start of each player, and how far the later ones went.
    private const string PLAYERS = <<<'SQL'
        SELECT
            COUNT(*) AS started,
            COALESCE(SUM(EXISTS (
                SELECT 1 FROM analytics_event c WHERE c.user_id = f.user_id AND c.name = 'workout_completed'
            )), 0) AS completed,
            COALESCE(SUM(EXISTS (
                SELECT 1 FROM analytics_event r WHERE r.user_id = f.user_id AND r.name = 'workout_repeated'
            )), 0) AS repeated,
            COALESCE(SUM(f.days > 1), 0) AS returned,
            COALESCE(SUM(f.last_at >= f.first_at + INTERVAL 7 DAY), 0) AS returned_after_week
        FROM (
            SELECT user_id, MIN(occurred_at) AS first_at, MAX(occurred_at) AS last_at, COUNT(DISTINCT DATE(occurred_at)) AS days
            FROM analytics_event
            WHERE name = 'workout_started' AND user_id IS NOT NULL
            GROUP BY user_id
        ) f
        WHERE f.first_at >= :since
        SQL;

    private const string MODES = <<<'SQL'
        SELECT
            mode,
            SUM(name = 'workout_started') AS started,
            SUM(name = 'workout_completed') AS completed,
            COUNT(DISTINCT CASE WHEN name = 'workout_started' THEN user_id END) AS players
        FROM analytics_event
        WHERE name IN ('workout_started', 'workout_completed') AND occurred_at >= :since
        GROUP BY mode
        ORDER BY started DESC, mode
        SQL;

    private const string SETUP_ERRORS = <<<'SQL'
        SELECT error, COUNT(*) AS events, COUNT(DISTINCT user_id) AS players
        FROM analytics_event
        WHERE name = 'setup_error' AND occurred_at >= :since
        GROUP BY error
        ORDER BY events DESC, error
        SQL;

    public function __construct(private Connection $connection)
    {
    }

    public function collect(?\DateTimeImmutable $since): Metrics
    {
        $parameters = ['since' => $since ?? new \DateTimeImmutable('@0')];
        $types = ['since' => Types::DATETIME_IMMUTABLE];
        $players = $this->connection->fetchAssociative(self::PLAYERS, $parameters, $types) ?: [];

        return new Metrics(
            self::count($players, 'started'),
            self::count($players, 'completed'),
            self::count($players, 'repeated'),
            self::count($players, 'returned'),
            self::count($players, 'returned_after_week'),
            array_map(static fn (array $row): array => [
                'mode' => (string) $row['mode'],
                'started' => self::count($row, 'started'),
                'completed' => self::count($row, 'completed'),
                'players' => self::count($row, 'players'),
            ], $this->connection->fetchAllAssociative(self::MODES, $parameters, $types)),
            array_map(static fn (array $row): array => [
                'error' => (string) $row['error'],
                'events' => self::count($row, 'events'),
                'players' => self::count($row, 'players'),
            ], $this->connection->fetchAllAssociative(self::SETUP_ERRORS, $parameters, $types)),
        );
    }

    /**
     * MySQL gives a sum as a decimal string.
     *
     * @param array<string, mixed> $row
     */
    private static function count(array $row, string $column): int
    {
        $value = $row[$column] ?? 0;

        return is_numeric($value) ? (int) $value : 0;
    }
}
