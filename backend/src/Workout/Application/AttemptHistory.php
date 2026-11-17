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
use Psr\Clock\ClockInterface;

/**
 * The history (§14) and its statistics.
 */
final readonly class AttemptHistory
{
    public function __construct(
        private AttemptRepository $attempts,
        private ClockInterface $clock,
    ) {
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

    // §24: counted from the attempts as well, so the game always agrees with the history. Its days go
    // by the calendar of the player (§24.12).
    public function game(UserId $owner, \DateTimeZone $zone): GameRecord
    {
        $today = $this->clock->now()->setTimezone($zone)->setTime(0, 0);
        $energy = [];

        foreach (GamePool::cases() as $pool) {
            $energy[$pool->value] = $this->attempts->energyFullAt($owner, $pool);
        }

        return new GameRecord(
            Tally::of($this->attempts->countByOutcome($owner, new AttemptFilter(pool: GamePool::Fight))),
            Tally::of($this->attempts->countByOutcome($owner, new AttemptFilter(pool: GamePool::Campaign))),
            $this->attempts->passedLevels($owner),
            $energy,
            $this->attempts->exerciseTotals($owner),
            $this->days($owner, $today),
            $this->week($owner, $today),
            $this->attempts->duelDone($owner),
            $this->attempts->duelAt($owner),
        );
    }

    /**
     * §24.12: the days with a battle a year back, by the calendar of the player.
     *
     * @return list<string>
     */
    private function days(UserId $owner, \DateTimeImmutable $today): array
    {
        $days = [];

        foreach ($this->attempts->finishedSince($owner, $today->modify('-1 year')) as $finishedAt) {
            $days[] = $finishedAt->setTimezone($today->getTimezone())->format('Y-m-d');
        }
        $days = array_values(array_unique($days));
        sort($days);

        return $days;
    }

    /**
     * §24.10: the repetitions of each exercise on each of the last seven days of the player.
     *
     * @return array<string, array<string, int>>
     */
    private function week(UserId $owner, \DateTimeImmutable $today): array
    {
        $week = [];

        foreach ($this->attempts->repsSince($owner, $today->modify('-6 days')) as ['finishedAt' => $finishedAt, 'exercise' => $exercise, 'reps' => $reps]) {
            $day = $finishedAt->setTimezone($today->getTimezone())->format('Y-m-d');
            $week[$day][$exercise] = ($week[$day][$exercise] ?? 0) + $reps;
        }
        ksort($week);

        foreach ($week as &$exercises) {
            ksort($exercises);
        }

        return $week;
    }
}
