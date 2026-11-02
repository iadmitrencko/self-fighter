<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\UserId;

interface CustomExerciseRepository
{
    public function add(CustomExercise $exercise): void;

    // Whoever owns it: two users must not share an id.
    public function find(ExerciseId $id): ?CustomExercise;

    /**
     * @return list<CustomExercise> in the order they were created
     */
    public function findAllOf(UserId $owner): array;

    public function isNameTaken(UserId $owner, string $nameKey, ExerciseId $exceptId): bool;

    public function remove(CustomExercise $exercise): void;

    public function removeAllOf(UserId $owner): void;
}
