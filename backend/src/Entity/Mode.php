<?php

declare(strict_types=1);

namespace App\Entity;

enum Mode: string
{
    case Target = 'target';
    case RandomOpponent = 'random-opponent';
    case OpponentLevels = 'opponent-levels';
    case Ladder = 'ladder';
}
