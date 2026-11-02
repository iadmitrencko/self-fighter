<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\UserId;

interface SettingsRepository
{
    public function add(Settings $settings): void;

    public function find(UserId $owner): ?Settings;

    public function remove(UserId $owner): void;
}
