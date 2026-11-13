<?php

declare(strict_types=1);

namespace App\Tests\Workout\Infrastructure\Json;

use App\Shared\Domain\Instant;
use App\Workout\Domain\GamePool;
use App\Workout\Infrastructure\Json\JsonEnergyRules;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * §24.4: backend/schema/energy.json gives the pools of energy to the server and to the browser.
 * Vitest checks the same examples against frontend/src/domain/kozak/energy.ts.
 */
final class JsonEnergyRulesTest extends TestCase
{
    private const string FILE = __DIR__.'/../../../../schema/energy.json';

    public function testGivesThePoolsOfTheGame(): void
    {
        $rules = new JsonEnergyRules(self::FILE);

        self::assertSame([10, 7_200_000], [$rules->of(GamePool::Fight)->max, $rules->of(GamePool::Fight)->periodMs]);
        self::assertSame([6, 7_200_000], [$rules->of(GamePool::Campaign)->max, $rules->of(GamePool::Campaign)->periodMs]);
    }

    #[DataProvider('examples')]
    public function testAnswersAsItsExamples(string $pool, ?string $fullAt, string $at, bool $allows, string $spent): void
    {
        $rule = new JsonEnergyRules(self::FILE)->of(GamePool::from($pool));
        $fullAtTime = null === $fullAt ? null : Instant::parse($fullAt);
        $atTime = Instant::parse($at) ?? throw new \UnexpectedValueException($at);

        self::assertSame($allows, $rule->allows($fullAtTime, $atTime));
        self::assertSame($spent, Instant::format($rule->spend($fullAtTime, $atTime)));
    }

    /**
     * @return iterable<string, array{string, ?string, string, bool, string}>
     */
    public static function examples(): iterable
    {
        $energy = json_decode((string) file_get_contents(self::FILE), true, 16, \JSON_THROW_ON_ERROR);
        self::assertIsArray($energy);
        self::assertIsArray($energy['examples'] ?? null);

        foreach ($energy['examples'] as $index => $example) {
            self::assertIsArray($example);

            yield \sprintf('%d: %s at %s', $index, $example['pool'], $example['at']) => [
                $example['pool'],
                $example['fullAt'],
                $example['at'],
                $example['allows'],
                $example['spent'],
            ];
        }
    }

    public function testRefusesAFileWithoutAPool(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'energy');
        self::assertIsString($file);
        file_put_contents($file, '{"pools": {"fight": {"max": 10, "periodMinutes": 120}}}');

        try {
            $this->expectException(\UnexpectedValueException::class);
            new JsonEnergyRules($file);
        } finally {
            unlink($file);
        }
    }
}
