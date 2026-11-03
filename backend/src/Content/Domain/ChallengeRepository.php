<?php

declare(strict_types=1);

namespace App\Content\Domain;

interface ChallengeRepository
{
    /**
     * @param list<Challenge> $challenges
     */
    public function replaceAll(array $challenges): void;

    /**
     * @return list<Challenge> in the order of the catalog
     */
    public function all(): array;

    public function find(string $slug): ?Challenge;

    /**
     * @return list<Challenge> in the order of the catalog
     */
    public function withExercise(string $exercise): array;

    /**
     * @return list<Challenge> in the order of the catalog
     */
    public function ofMode(string $mode): array;
}
