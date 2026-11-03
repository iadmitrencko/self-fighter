<?php

declare(strict_types=1);

namespace App\Content\Domain;

enum Level: string
{
    case Easy = 'easy';
    case Medium = 'medium';
    case Hard = 'hard';
}
