<?php

declare(strict_types=1);

namespace App\Content\Domain;

// §21.4: a challenge goes to the index when people search for it or the catalog needs it.
enum Demand: string
{
    case Verified = 'verified';
    case Navigation = 'navigation';
    case Unverified = 'unverified';
}
