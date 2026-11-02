<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use App\Workout\Domain\CustomExercise;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\ExerciseDetails;
use App\Workout\Domain\ExerciseId;
use Psr\Clock\ClockInterface;

/**
 * Creates or changes a custom exercise (§5.2). The browser creates the id, so a repeated request does not add a copy.
 */
final readonly class SaveExercise
{
    public function __construct(
        private CustomExerciseRepository $exercises,
        private UserTransaction $transaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @throws Refusal
     */
    public function __invoke(UserId $owner, ExerciseId $id, string $name, string $description): SavedExercise
    {
        $details = ExerciseDetails::tryFrom($name, $description) ?? throw Refusal::invalid('invalid-exercise');

        return $this->transaction->run($owner, function () use ($owner, $id, $details): SavedExercise {
            $exercise = $this->exercises->find($id);

            if (null !== $exercise && !$exercise->belongsTo($owner)) {
                throw Refusal::conflict('conflict');
            }
            // §5.2: a name repeats no other name of the catalog, whatever the case.
            if ($this->exercises->isNameTaken($owner, $details->nameKey, $id)) {
                throw Refusal::conflict('exercise-name-taken');
            }

            if (null === $exercise) {
                $exercise = CustomExercise::create($id, $owner, $details, $this->clock->now());
                $this->exercises->add($exercise);

                return new SavedExercise($exercise, true);
            }

            $exercise->change($details, $this->clock->now());

            return new SavedExercise($exercise, false);
        });
    }
}
