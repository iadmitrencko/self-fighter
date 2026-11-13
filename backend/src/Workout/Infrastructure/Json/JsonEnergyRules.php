<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Json;

use App\Workout\Application\EnergyRules;
use App\Workout\Domain\EnergyRule;
use App\Workout\Domain\GamePool;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The pools of energy as backend/schema/energy.json gives them. The browser counts with the same
 * file, so the game and the server never part.
 */
final readonly class JsonEnergyRules implements EnergyRules
{
    /** @var array<string, EnergyRule> */
    private array $rules;

    public function __construct(#[Autowire('%kernel.project_dir%/schema/energy.json')] string $file)
    {
        $energy = json_decode((string) file_get_contents($file), true, 16, \JSON_THROW_ON_ERROR);
        $pools = \is_array($energy) && \is_array($energy['pools'] ?? null) ? $energy['pools'] : [];
        $rules = [];

        foreach (GamePool::cases() as $pool) {
            $rule = $pools[$pool->value] ?? null;

            if (!\is_array($rule) || !\is_int($rule['max'] ?? null) || !\is_int($rule['periodMinutes'] ?? null)) {
                throw new \UnexpectedValueException(\sprintf('%s has no pool "%s".', $file, $pool->value));
            }
            $rules[$pool->value] = new EnergyRule($rule['max'], $rule['periodMinutes'] * 60_000);
        }

        $this->rules = $rules;
    }

    public function of(GamePool $pool): EnergyRule
    {
        return $this->rules[$pool->value];
    }
}
