<?php

declare(strict_types=1);

namespace App\Account\Application;

final readonly class PurgeReport
{
    public function __construct(
        public int $devices,
        public int $guests,
    ) {
    }
}
