<?php

declare(strict_types=1);

namespace App\Shared\Application;

enum RefusalReason
{
    case Invalid;
    case Conflict;
    case UserGone;
}
