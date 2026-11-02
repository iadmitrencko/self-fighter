<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\CustomExercise;

final readonly class SavedExercise
{
    public function __construct(
        public CustomExercise $exercise,
        public bool $created,
    ) {
    }
}
