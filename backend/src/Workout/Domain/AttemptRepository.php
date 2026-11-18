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
     * @return array<string, int> the number of attempts for each outcome
     */
    public function countByOutcome(UserId $owner, AttemptFilter $filter): array;

    /**
     * @return list<string> the levels of the journey won at least once, in alphabetical order (§24.5)
     */
    public function passedLevels(UserId $owner): array;

    /**
     * §24.10: the most repetitions done in one set and every repetition done, by the exercise: in
     * the fights, the journey and the duel alike.
     *
     * @return array<string, array{best: int, total: int}> by the id of the exercise, in alphabetical order
     */
    public function exerciseTotals(UserId $owner): array;

    /**
     * §24.10: the repetitions done of each exercise in every battle that finished since the moment,
     * with the time it finished.
     *
     * @return list<array{finishedAt: \DateTimeImmutable, exercise: string, reps: int}>
     */
    public function repsSince(UserId $owner, \DateTimeImmutable $since): array;

    /**
     * §24.12: when the battles that finished since the moment ended, a battle left before its first
     * set too.
     *
     * @return list<\DateTimeImmutable>
     */
    public function finishedSince(UserId $owner, \DateTimeImmutable $since): array;

    /**
     * §24.9: the places in their rounds of the sets of the duel with the King done, by the round.
     *
     * @return array<string, list<int>> by the round in alphabetical order, the places in order
     */
    public function duelDone(UserId $owner): array;

    // §24.9: when the latest battle of the duel ended, or null before the first one.
    public function duelAt(UserId $owner): ?\DateTimeImmutable;

    // §24.4: the moment the pool is full again by the battles that took from it, or null for none.
    public function energyFullAt(UserId $owner, GamePool $pool): ?\DateTimeImmutable;

    // §24.4: the same moment by the battles that started before the given one.
    public function energyFullAtBefore(UserId $owner, GamePool $pool, Battle $battle): ?\DateTimeImmutable;

    /**
     * §24.4: the battles of the pool in the order they started, all of them or those after the given one.
     *
     * @return list<Battle>
     */
    public function battles(UserId $owner, GamePool $pool, ?Battle $after = null): array;

    // §24.4: an earlier battle that arrives later moves the moment its pool is full again after the later ones.
    public function recountEnergy(AttemptId $id, \DateTimeImmutable $energyFullAt): void;

    // §23.3: the attempts keep their ids, so moving them twice adds nothing.
    public function removeAllOf(UserId $owner): void;
}
