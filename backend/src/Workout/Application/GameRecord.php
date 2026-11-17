<?php

declare(strict_types=1);

namespace App\Workout\Application;

/**
 * §24: what the attempts of the game add up to. The game derives glory, rank and progress from
 * it by its own rules (frontend/src/domain/kozak), so the server only counts.
 */
final readonly class GameRecord
{
    /**
     * @param list<string>                                $passed    the levels of the journey won at least once, in alphabetical order
     * @param array<string, ?\DateTimeImmutable>          $energy    when each pool of energy is full again, by its name
     * @param array<string, array{best: int, total: int}> $exercises §24.10: the largest set and every repetition done in all attempts, by the exercise
     * @param list<string>                                $days      §24.12: the days with a battle a year back by the calendar of the player, in order
     * @param array<string, array<string, int>>           $week      §24.10: the repetitions of each exercise on each of the last seven days of the player
     * @param array<string, list<int>>                    $duel      §24.9: the places of the sets of the duel done, by the round
     */
    public function __construct(
        public Tally $fights,
        public Tally $campaign,
        public array $passed,
        public array $energy,
        public array $exercises,
        public array $days,
        public array $week,
        public array $duel,
        public ?\DateTimeImmutable $duelAt,
    ) {
    }
}
