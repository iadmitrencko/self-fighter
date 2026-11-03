<?php

declare(strict_types=1);

namespace App\Tests\Workout;

use App\Workout\Domain\AttemptId;

/**
 * Valid documents as frontend/src/domain produces them. The server checks their structure only,
 * so a test may set any outcome.
 */
final class Documents
{
    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function fight(string $outcome = 'win', string $finishedAt = '2026-11-02T10:18:24.000Z', array $overrides = []): array
    {
        $pushUps = ['id' => 'push-ups', 'name' => 'Віджимання'];

        return array_replace([
            'schemaVersion' => 2,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 1_104_000,
            'challenge' => null,
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
            'schemaVersion' => 2,
            'id' => AttemptId::generate()->value,
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'finishedAt' => $finishedAt,
            'durationMs' => 300_000,
            'challenge' => null,
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
     * A ready-made challenge as the game names it in an attempt (§21.3).
     *
     * @return array{slug: string, title: string}
     */
    public static function challenge(string $slug): array
    {
        return ['slug' => $slug, 'title' => 'Виклик '.$slug];
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
