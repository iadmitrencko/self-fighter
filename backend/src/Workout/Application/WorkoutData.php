<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\SettingsRepository;

/**
 * The part of the export and of the deletion that the workouts of a user make up (§15.5).
 */
final readonly class WorkoutData implements UserDataHolder
{
    public function __construct(
        private CustomExerciseRepository $exercises,
        private SettingsRepository $settings,
        private AttemptRepository $attempts,
        private ListExercises $listExercises,
        private FindSettings $findSettings,
    ) {
    }

    public function export(UserId $user): array
    {
        return [
            'exercises' => ($this->listExercises)($user),
            // An object even when empty, as the browser expects it.
            'settings' => (object) ($this->findSettings)($user),
            'attempts' => array_map(static fn (Attempt $attempt): array => $attempt->document(), $this->attempts->findAllOf($user)),
        ];
    }

    public function erase(UserId $user): void
    {
        $this->attempts->removeAllOf($user);
        $this->exercises->removeAllOf($user);
        $this->settings->remove($user);
    }
}
