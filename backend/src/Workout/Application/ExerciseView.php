<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\CustomExercise;

// A custom exercise as the browser sees it (CustomExercise in frontend/src/storage/contract.ts).
final class ExerciseView
{
    /**
     * @return array{id: string, name: string, description: string}
     */
    public static function of(CustomExercise $exercise): array
    {
        return [
            'id' => $exercise->id()->value,
            'name' => $exercise->name(),
            'description' => $exercise->description(),
        ];
    }
}
