<?php

declare(strict_types=1);

namespace App\Workout\Domain;

// The result of a whole battle (§14.2). The battles of the game are won or lost so far; the
// history counts draws as well, for the battles to come.
enum Outcome: string
{
    case Win = 'win';
    case Draw = 'draw';
    case Loss = 'loss';
}
