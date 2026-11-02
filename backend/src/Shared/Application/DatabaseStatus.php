<?php

declare(strict_types=1);

namespace App\Shared\Application;

interface DatabaseStatus
{
    public function isAvailable(): bool;
}
