<?php

declare(strict_types=1);

namespace App\Workout\Domain;

enum Mode: string
{
    case Target = 'target';
    case RandomOpponent = 'random-opponent';
    case OpponentLevels = 'opponent-levels';
    case Ladder = 'ladder';
}
