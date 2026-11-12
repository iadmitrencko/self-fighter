<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Domain\UserId;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptFilter;
use App\Workout\Domain\AttemptId;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\GamePool;
use App\Workout\Domain\Outcome;

/**
 * The history (§14) and its statistics.
 */
final readonly class AttemptHistory
{
    public function __construct(private AttemptRepository $attempts)
    {
    }

    public function find(UserId $owner, AttemptId $id): ?Attempt
    {
        $attempt = $this->attempts->find($id);

        return null !== $attempt && $attempt->belongsTo($owner) ? $attempt : null;
    }

    // The next page starts after the last attempt of the previous one.
    public function page(UserId $owner, AttemptFilter $filter, int $limit, ?Attempt $after = null): AttemptPage
    {
        // One more than asked tells whether another page exists.
        $found = $this->attempts->findPage($owner, $filter, $limit + 1, $after);
        $attempts = \array_slice($found, 0, $limit);
        $last = end($attempts);

        return new AttemptPage($attempts, \count($found) > $limit && false !== $last ? $last : null);
    }

    // Counted from the attempts every time, so the numbers always agree with the history (§14.2).
    public function statistics(UserId $owner, AttemptFilter $filter): Statistics
    {
        $counts = $this->attempts->countByOutcome($owner, $filter);

        return new Statistics(
            array_sum($counts),
            $counts[Outcome::Win->value] ?? 0,
            $counts[Outcome::Draw->value] ?? 0,
            $counts[Outcome::Loss->value] ?? 0,
        );
    }

    // §24: counted from the attempts as well, so the game always agrees with the history.
    public function game(UserId $owner): GameRecord
    {
        $energy = [];

        foreach (GamePool::cases() as $pool) {
            $energy[$pool->value] = $this->attempts->energyFullAt($owner, $pool);
        }

        return new GameRecord(
            Tally::of($this->attempts->countByOutcome($owner, new AttemptFilter(pool: GamePool::Fight))),
            Tally::of($this->attempts->countByOutcome($owner, new AttemptFilter(pool: GamePool::Campaign))),
            $this->attempts->passedLevels($owner),
            $energy,
            $this->attempts->bestSets($owner),
        );
    }
}
