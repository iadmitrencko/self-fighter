<?php

declare(strict_types=1);

namespace App\Workout\Domain;

enum Mode: string
{
    case Target = 'target';
    case RandomOpponent = 'random-opponent';
    case OpponentLevels = 'opponent-levels';
    case Ladder = 'ladder';
    // §24.5: a level of the journey of the game. The journey sets it, so it has no settings.
    case Campaign = 'campaign';
}
