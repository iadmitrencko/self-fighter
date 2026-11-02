<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Infrastructure\Doctrine\Uuid7Type;
use App\Workout\Domain\ExerciseId;

final class ExerciseIdType extends Uuid7Type
{
    public const string NAME = 'exercise_id';

    protected function idClass(): string
    {
        return ExerciseId::class;
    }
}
