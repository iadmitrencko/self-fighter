<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Domain\UserId;
use App\Workout\Domain\CustomExerciseRepository;

final readonly class ListExercises
{
    public function __construct(private CustomExerciseRepository $exercises)
    {
    }

    /**
     * @return list<array{id: string, name: string, description: string}>
     */
    public function __invoke(UserId $owner): array
    {
        return array_map(ExerciseView::of(...), $this->exercises->findAllOf($owner));
    }
}
