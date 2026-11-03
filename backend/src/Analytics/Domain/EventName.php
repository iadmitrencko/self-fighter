<?php

declare(strict_types=1);

namespace App\Analytics\Domain;

// The steps of a player that answer the questions of §19 (stage 8 of the plan).
enum EventName: string
{
    // Every start, a repeated one too.
    case WorkoutStarted = 'workout_started';
    case WorkoutCompleted = 'workout_completed';
    // A start with «Повторити» (§13.4). A workout_started comes with it.
    case WorkoutRepeated = 'workout_repeated';
    // A start the setup check refused, one event for each kind of problem (§11.5).
    case SetupError = 'setup_error';
}
