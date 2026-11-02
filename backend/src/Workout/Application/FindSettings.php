<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Domain\UserId;
use App\Workout\Domain\SettingsRepository;

final readonly class FindSettings
{
    public function __construct(private SettingsRepository $settings)
    {
    }

    /**
     * @return array<string, array<mixed>> the last configuration of each mode, keyed by the mode
     */
    public function __invoke(UserId $owner): array
    {
        return $this->settings->find($owner)?->configurations() ?? [];
    }
}
