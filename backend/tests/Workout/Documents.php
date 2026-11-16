<?php

declare(strict_types=1);

namespace App\Tests\Workout;

use App\Workout\Domain\AttemptId;

/**
 * Valid documents of format version 6 as frontend/src/domain produces them or the server stores
 * them. The server checks their structure and the energy of a battle (§24.4), so a test may set
 * any outcome.
 */
final class Documents
{
    /**
     * §6: a fight of the game, put together from exercises and rounds. Every set but the last is
     * done unless the fight is won.
     *
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function fight(
        string $outcome = 'win',
        string $finishedAt = '2026-11-02T10:18:24.000Z',
        string $energyFullAt = '2026-11-02T12:00:00.000Z',
        array $overrides = [],
    ): array {
        return array_replace([
            'schemaVersion' => 6,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 1_104_000,
            'game' => self::game('fight', $energyFullAt),
            'mode' => 'fight',
            'config' => self::fightConfig(),
            'result' => [
                'exercises' => [
                    ['exercise' => ['id' => 'push-ups', 'name' => 'Відтискання'], 'sets' => [['target' => 10, 'done' => true], ['target' => 12, 'done' => true]]],
                    ['exercise' => ['id' => 'squats', 'name' => 'Присідання'], 'sets' => [['target' => 15, 'done' => true], ['target' => 20, 'done' => 'win' === $outcome]]],
                ],
                'outcome' => $outcome,
            ],
        ], $overrides);
    }

    /**
     * §24.5: a level of the journey. Every set but the last is done unless the level is won.
     *
     * @param list<int>             $sets
     * @param array<string, mixed>  $overrides
     * @param array<string, string> $exercise  the ready-made exercise of the campaign
     *
     * @return array<string, mixed>
     */
    public static function level(
        string $level = 'forest-ravens/1/1',
        string $outcome = 'win',
        string $energyFullAt = '2026-11-02T15:00:00.000Z',
        array $sets = [1, 1, 1],
        array $overrides = [],
        array $exercise = ['id' => 'pull-ups', 'name' => 'Підтягування'],
    ): array {
        $last = \count($sets) - 1;

        return array_replace([
            'schemaVersion' => 6,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => '2026-11-02T10:06:00.000Z',
            'durationMs' => 360_000,
            'game' => self::game('campaign', $energyFullAt),
            'mode' => 'campaign',
            'config' => [
                'mode' => 'campaign',
                'level' => $level,
                'exercise' => $exercise,
                'sets' => $sets,
            ],
            'result' => [
                'sets' => array_map(static fn (int $reps, int $index): array => ['target' => $reps, 'done' => 'win' === $outcome || $index < $last], $sets, array_keys($sets)),
                'outcome' => $outcome,
            ],
        ], $overrides);
    }

    /**
     * §24.9: a battle of the duel with the King: the sets of its round from the place `from`. Every
     * set but the last is done unless the battle is won.
     *
     * @param list<array{string, int}> $sets      the exercise and the repetitions of every set
     * @param array<string, mixed>     $overrides
     *
     * @return array<string, mixed>
     */
    public static function duel(
        string $round = 'final-battle/1/4',
        string $outcome = 'win',
        int $from = 0,
        array $sets = [['push-ups', 15], ['squats', 25], ['pull-ups', 5]],
        array $overrides = [],
    ): array {
        $names = ['push-ups' => 'Відтискання', 'squats' => 'Присідання', 'pull-ups' => 'Підтягування'];
        $exercise = static fn (string $id): array => ['id' => $id, 'name' => $names[$id] ?? $id];
        $last = \count($sets) - 1;

        return array_replace([
            'schemaVersion' => 6,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => '2026-11-02T10:10:00.000Z',
            'durationMs' => 600_000,
            'game' => self::game('campaign', '2026-11-02T12:00:00.000Z'),
            'mode' => 'duel',
            'config' => [
                'mode' => 'duel',
                'round' => $round,
                'from' => $from,
                'sets' => array_map(static fn (array $set): array => ['exercise' => $exercise($set[0]), 'reps' => $set[1]], $sets),
            ],
            'result' => [
                'sets' => array_map(
                    static fn (array $set, int $index): array => ['exercise' => $exercise($set[0]), 'target' => $set[1], 'done' => 'win' === $outcome || $index < $last],
                    $sets,
                    array_keys($sets),
                ),
                'outcome' => $outcome,
            ],
        ], $overrides);
    }

    /**
     * §24.4: the pool of energy a battle of the game took and the moment it is full again.
     *
     * @return array{pool: string, energyFullAt: string}
     */
    public static function game(string $pool = 'fight', string $energyFullAt = '2026-11-02T12:00:00.000Z'): array
    {
        return ['pool' => $pool, 'energyFullAt' => $energyFullAt];
    }

    /**
     * §6: push-ups and squats in two rounds.
     *
     * @return array<string, mixed>
     */
    public static function fightConfig(): array
    {
        return [
            'mode' => 'fight',
            'exercises' => [
                ['id' => 'push-ups', 'name' => 'Відтискання', 'sets' => [10, 12]],
                ['id' => 'squats', 'name' => 'Присідання', 'sets' => [15, 20]],
            ],
        ];
    }
}
