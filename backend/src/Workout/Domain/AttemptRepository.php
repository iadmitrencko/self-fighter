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

    /**
     * @return list<string> the slugs of the ready-made challenges won at least once, in alphabetical order
     */
    public function passedChallenges(UserId $owner, AttemptFilter $filter): array;

    /**
     * @return list<string> the levels of the journey won at least once, in alphabetical order (§24.5)
     */
    public function passedLevels(UserId $owner): array;

    // §24.4: the moment the pool is full again by the battles that took from it, or null for none.
    public function energyFullAt(UserId $owner, GamePool $pool): ?\DateTimeImmutable;

    // §23.3: the attempts keep their ids, so moving them twice adds nothing.
    public function transfer(UserId $from, UserId $to): void;

    public function removeAllOf(UserId $owner): void;
}
