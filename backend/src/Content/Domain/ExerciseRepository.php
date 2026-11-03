<?php

declare(strict_types=1);

namespace App\Content\Domain;

interface ExerciseRepository
{
    /**
     * @param list<Exercise> $exercises
     */
    public function replaceAll(array $exercises): void;

    /**
     * @return list<Exercise> in the order of the catalog
     */
    public function all(): array;

    public function find(string $slug): ?Exercise;
}
