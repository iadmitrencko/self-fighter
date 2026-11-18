<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\SettingsRepository;

/**
 * The part of the deletion of an account that its workouts make up (§15.5).
 */
final readonly class WorkoutData implements UserDataHolder
{
    public function __construct(
        private CustomExerciseRepository $exercises,
        private SettingsRepository $settings,
        private AttemptRepository $attempts,
    ) {
    }

    public function erase(UserId $user): void
    {
        $this->attempts->removeAllOf($user);
        $this->exercises->removeAllOf($user);
        $this->settings->remove($user);
    }
}
