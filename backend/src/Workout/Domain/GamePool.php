<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * §24.4: the pool of energy a battle of the game took. A workout of the site takes none.
 */
enum GamePool: string
{
    case Fight = 'fight';
    case Campaign = 'campaign';
}
