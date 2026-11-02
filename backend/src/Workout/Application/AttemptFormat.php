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
    /**
     * @return array<mixed>|null the attempt, or null when the JSON is not a finished attempt of a supported format version
     */
    public function readAttempt(string $json): ?array;

    /**
     * @return array<mixed>|null the configuration, or null when the JSON is not a configuration of the mode
     */
    public function readConfiguration(string $json, Mode $mode): ?array;
}
