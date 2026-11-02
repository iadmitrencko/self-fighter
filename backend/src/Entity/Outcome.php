<?php

declare(strict_types=1);

namespace App\Entity;

// The result of a whole fight or ladder (§14.2).
enum Outcome: string
{
    case Win = 'win';
    case Draw = 'draw';
    case Loss = 'loss';
}
