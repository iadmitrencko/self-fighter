<?php

declare(strict_types=1);

namespace App\Tests\Workout;

use App\Workout\Domain\AttemptId;

/**
 * Valid documents of format version 4 as frontend/src/domain produces them or the server stores
 * them. The server checks their structure only, so a test may set any outcome.
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
            'schemaVersion' => 4,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 1_104_000,
            'challenge' => null,
            'game' => self::game('fight', $energyFullAt),
            'mode' => 'fight',
            'config' => self::fightConfig(),
            'result' => [
                'exercises' => [
                    ['exercise' => ['id' => 'push-ups', 'name' => 'Віджимання'], 'sets' => [['target' => 10, 'done' => true], ['target' => 12, 'done' => true]]],
                    ['exercise' => ['id' => 'squats', 'name' => 'Присідання'], 'sets' => [['target' => 15, 'done' => true], ['target' => 20, 'done' => 'win' === $outcome]]],
                ],
                'outcome' => $outcome,
            ],
        ], $overrides);
    }

    /**
     * An attempt of «Ціль», a mode of the site before §6. The history keeps such attempts.
     *
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function target(string $outcome = 'win', string $finishedAt = '2026-11-02T10:18:24.000Z', array $overrides = []): array
    {
        $pushUps = ['id' => 'push-ups', 'name' => 'Віджимання'];

        return array_replace([
            'schemaVersion' => 4,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 1_104_000,
            'challenge' => null,
            'game' => null,
            'mode' => 'target',
            'config' => self::targetConfig(),
            'result' => [
                'rounds' => [[
                    'exercises' => [['exercise' => $pushUps, 'target' => 10, 'actual' => 11, 'outcome' => 'win']],
                    'won' => 1,
                    'lost' => 0,
                    'outcome' => 'win',
                ]],
                'won' => 1,
                'drawn' => 0,
                'lost' => 0,
                'outcome' => $outcome,
            ],
        ], $overrides);
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function ladder(string $outcome = 'win', string $finishedAt = '2026-11-02T10:05:00.000Z', array $overrides = []): array
    {
        return array_replace([
            'schemaVersion' => 4,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 300_000,
            'challenge' => null,
            'game' => null,
            'mode' => 'ladder',
            'config' => self::ladderConfig(),
            'result' => [
                'stages' => [
                    ['target' => 1, 'actual' => 2, 'passed' => true],
                    ['target' => 2, 'actual' => null, 'passed' => false],
                ],
                'maxPassed' => 1,
                'passedCount' => 1,
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
            'schemaVersion' => 4,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => '2026-11-02T10:06:00.000Z',
            'durationMs' => 360_000,
            'challenge' => null,
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
     * §24.4: the pool of energy a battle of the game took and the moment it is full again.
     *
     * @return array{pool: string, energyFullAt: string}
     */
    public static function game(string $pool = 'fight', string $energyFullAt = '2026-11-02T12:00:00.000Z'): array
    {
        return ['pool' => $pool, 'energyFullAt' => $energyFullAt];
    }

    /**
     * A ready-made challenge as the game names it in an attempt (§21.3).
     *
     * @return array{slug: string, title: string}
     */
    public static function challenge(string $slug): array
    {
        return ['slug' => $slug, 'title' => 'Виклик '.$slug];
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
                ['id' => 'push-ups', 'name' => 'Віджимання', 'sets' => [10, 12]],
                ['id' => 'squats', 'name' => 'Присідання', 'sets' => [15, 20]],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function targetConfig(): array
    {
        return [
            'mode' => 'target',
            'rule' => 'over',
            'rounds' => 1,
            'exercises' => [['id' => 'push-ups', 'name' => 'Віджимання', 'targets' => [10]]],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function ladderConfig(): array
    {
        return [
            'mode' => 'ladder',
            'rule' => 'over',
            'exercise' => ['id' => 'pull-ups', 'name' => 'Підтягування'],
            'max' => 2,
            'returnDown' => false,
        ];
    }
}
