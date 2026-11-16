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
     * @param int                                         $fightStreak §24.7: the fights won one after another since the last one that was not
     * @param list<string>                                $passed      the levels of the journey won at least once, in alphabetical order
     * @param array<string, ?\DateTimeImmutable>          $energy      when each pool of energy is full again, by its name
     * @param array<string, int>                          $best        the most repetitions done in one set of the journey, by the exercise
     * @param array<string, array{best: int, total: int}> $exercises   §24.10: the largest set and every repetition done in all attempts, by the exercise
     * @param array<string, list<int>>                    $duel        §24.9: the places of the sets of the duel done, by the round
     */
    public function __construct(
        public Tally $fights,
        public int $fightStreak,
        public Tally $campaign,
        public array $passed,
        public array $energy,
        public array $best,
        public array $exercises,
        public array $duel,
        public ?\DateTimeImmutable $duelAt,
    ) {
    }
}
