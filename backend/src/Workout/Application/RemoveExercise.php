<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use App\Workout\Domain\CustomExerciseRepository;
use App\Workout\Domain\ExerciseId;

/**
 * Saved attempts keep their own copy of the name, so removing an exercise does not touch the history (§5.3).
 */
final readonly class RemoveExercise
{
    public function __construct(
        private CustomExerciseRepository $exercises,
        private UserTransaction $transaction,
    ) {
    }

    public function __invoke(UserId $owner, ExerciseId $id): void
    {
        $this->transaction->run($owner, function () use ($owner, $id): void {
            $exercise = $this->exercises->find($id);

            if (null !== $exercise && $exercise->belongsTo($owner)) {
                $this->exercises->remove($exercise);
            }
        });
    }
}
