<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\EnergyRule;
use App\Workout\Domain\GamePool;

/**
 * §24.4: the pools of energy of the game (backend/schema/energy.json).
 */
interface EnergyRules
{
    public function of(GamePool $pool): EnergyRule;
}
