<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Workout\Domain\Mode;

/**
 * The structure and limits of attempts and configurations (backend/schema/attempt.schema.json).
 * The browser checks the same file in its tests, so both sides agree on the format.
 */
interface AttemptFormat
{
    // Version 6 knows the battles of the game only: a fight (§6), a level of the journey (§24.5) and a
    // battle of the duel with the King of robbers (§24.9). No other version is accepted (section 3.7
    // of the plan).
    public const int VERSION = 6;

    /**
     * @return array<mixed>|null the attempt, or null when the JSON is not a finished attempt of the current version
     */
    public function readAttempt(string $json): ?array;

    /**
     * @return array<mixed>|null the configuration, or null when the JSON is not a configuration of the mode
     *                           or the mode has no settings
     */
    public function readConfiguration(string $json, Mode $mode): ?array;
}
