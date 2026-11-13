<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\Refusal;
use App\Shared\Domain\UserId;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\Battle;
use App\Workout\Domain\EnergyReplay;
use App\Workout\Domain\GamePool;
use Psr\Clock\ClockInterface;

/**
 * §24.4: the server keeps the energy of the game. It refuses a battle that started while its pool
 * was empty, so no script fills the history faster than the game allows. The browser counts the
 * same way (frontend/src/domain/kozak/energy.ts) to answer at once and to play without the network.
 */
final readonly class BattleEnergy
{
    // A battle waits in the browser while there is no network (§15.4), so it may arrive days later.
    private const string ACCEPTED_FOR = '7 days';
    // The clock of a phone may run ahead; a battle from further ahead would take energy of days to come.
    private const string AHEAD_UP_TO = '1 day';
    // The browser counts in milliseconds and the database keeps seconds, and two devices may differ a little.
    private const int GRACE_MS = 60_000;

    public function __construct(
        private AttemptRepository $attempts,
        private EnergyRules $rules,
        private ClockInterface $clock,
    ) {
    }

    /**
     * Counts when the pool of a new battle is full again and moves the battles that started after
     * it: a battle that waited in the browser takes a unit from them as well.
     *
     * @throws Refusal when the battle started out of time, found its pool empty or leaves a later battle without a unit
     */
    public function admit(UserId $owner, Attempt $attempt): Attempt
    {
        $pool = $attempt->pool();

        // A workout of the site takes no energy.
        if (null === $pool) {
            return $attempt;
        }
        $now = $this->clock->now();
        $battle = new Battle($attempt->id(), self::seconds($attempt->startedAt()));

        if ($battle->startedAt < $now->modify('-'.self::ACCEPTED_FOR) || $battle->startedAt > $now->modify('+'.self::AHEAD_UP_TO)) {
            throw Refusal::conflict('battle-out-of-time');
        }
        $rule = $this->rules->of($pool);
        $fullAt = $this->attempts->energyFullAtBefore($owner, $pool, $battle);
        $later = $this->attempts->battles($owner, $pool, $battle);
        $starts = array_map(static fn (Battle $next): \DateTimeImmutable => $next->startedAt, $later);
        $without = EnergyReplay::of($rule, $fullAt, $starts, self::GRACE_MS);
        $with = EnergyReplay::of($rule, $fullAt, [$battle->startedAt, ...$starts], self::GRACE_MS);

        // Battles saved before this rule may have found their pool empty already; only a new one counts.
        if ($with->starved > $without->starved) {
            throw Refusal::conflict('no-energy');
        }
        $this->keep($later, \array_slice($with->fullAt, 1));

        return $attempt->withEnergyFullAt($with->fullAt[0] ?? throw new \LogicException('The replay lost the new battle.'));
    }

    // §23.3: the battles of a guest join those of the account, so the account counts its energy anew.
    public function recount(UserId $owner): void
    {
        foreach (GamePool::cases() as $pool) {
            $battles = $this->attempts->battles($owner, $pool);
            $starts = array_map(static fn (Battle $battle): \DateTimeImmutable => $battle->startedAt, $battles);

            $this->keep($battles, EnergyReplay::of($this->rules->of($pool), null, $starts)->fullAt);
        }
    }

    /**
     * @param list<Battle>             $battles
     * @param list<\DateTimeImmutable> $fullAt  the moments counted for them, in the same order
     */
    private function keep(array $battles, array $fullAt): void
    {
        foreach ($battles as $index => $battle) {
            $counted = $fullAt[$index] ?? null;

            if (null !== $counted && $battle->energyFullAt?->getTimestamp() !== $counted->getTimestamp()) {
                $this->attempts->recountEnergy($battle->id, $counted);
            }
        }
    }

    // The database keeps whole seconds, so the battles are counted by them.
    private static function seconds(\DateTimeImmutable $time): \DateTimeImmutable
    {
        return $time->setTime((int) $time->format('H'), (int) $time->format('i'), (int) $time->format('s'));
    }
}
