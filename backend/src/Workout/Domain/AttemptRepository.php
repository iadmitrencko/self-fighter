<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\UserId;

interface AttemptRepository
{
    public function add(Attempt $attempt): void;

    // Whoever owns it: two users must not share an id.
    public function find(AttemptId $id): ?Attempt;

    /**
     * The newest first. The page starts after the last attempt of the previous one.
     *
     * @return list<Attempt>
     */
    public function findPage(UserId $owner, AttemptFilter $filter, int $limit, ?Attempt $after = null): array;

    /**
     * @return list<Attempt> the oldest first
     */
    public function findAllOf(UserId $owner): array;

    /**
     * @return array<string, int> the number of attempts for each outcome
     */
    public function countByOutcome(UserId $owner, AttemptFilter $filter): array;

    public function removeAllOf(UserId $owner): void;
}
