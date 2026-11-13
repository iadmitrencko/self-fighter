<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\UserDataHolder;
use App\Shared\Domain\UserId;
use App\Workout\Domain\AttemptFilter;
use App\Workout\Domain\AttemptRepository;
use App\Workout\Domain\CustomExercise;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\Settings;
use App\Workout\Domain\SettingsRepository;
use Psr\Clock\ClockInterface;

/**
 * The part of the deletion and the joining of a guest to an account that the workouts of a user
 * make up (§15.5, §23.3).
 */
final readonly class WorkoutData implements UserDataHolder
{
    public function __construct(
        private CustomExerciseRepository $exercises,
        private SettingsRepository $settings,
        private AttemptRepository $attempts,
        private BattleEnergy $energy,
        private ClockInterface $clock,
    ) {
    }

    public function erase(UserId $user): void
    {
        $this->attempts->removeAllOf($user);
        $this->exercises->removeAllOf($user);
        $this->settings->remove($user);
    }

    // The settings are not counted: the next workout sets them again in a moment.
    public function summary(UserId $user): array
    {
        return [
            'attempts' => array_sum($this->attempts->countByOutcome($user, new AttemptFilter())),
            'exercises' => \count($this->exercises->findAllOf($user)),
        ];
    }

    /**
     * Attempts keep the names of their exercises (§5.3), so they move as they are, and the account
     * counts the energy of its battles anew with those of the guest (§24.4). A custom exercise with
     * a name the account already has gives way to the one of the account, and so do the settings
     * of a mode both have set up.
     */
    public function transfer(UserId $guest, UserId $account): void
    {
        $this->attempts->transfer($guest, $account);
        $this->energy->recount($account);

        $taken = array_map(static fn (CustomExercise $exercise): string => $exercise->nameKey(), $this->exercises->findAllOf($account));

        foreach ($this->exercises->findAllOf($guest) as $exercise) {
            if (\in_array($exercise->nameKey(), $taken, true)) {
                $this->exercises->remove($exercise);
            } else {
                $exercise->moveTo($account);
            }
        }

        $settings = $this->settings->find($guest);

        if (null !== $settings) {
            $this->takeSettings($settings, $account);
            $this->settings->remove($guest);
        }
    }

    private function takeSettings(Settings $guest, UserId $account): void
    {
        $now = $this->clock->now();
        $settings = $this->settings->find($account);

        if (null === $settings) {
            $settings = Settings::empty($account, $now);
            $this->settings->add($settings);
        }

        $settings->takeMissingFrom($guest, $now);
    }
}
