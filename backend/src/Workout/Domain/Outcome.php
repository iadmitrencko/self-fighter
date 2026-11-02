<?php

declare(strict_types=1);

namespace App\Workout\Domain;

// The result of a whole fight or ladder (§14.2).
enum Outcome: string
{
    case Win = 'win';
    case Draw = 'draw';
    case Loss = 'loss';
}
