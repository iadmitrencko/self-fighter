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
    // Version 2 added the ready-made challenge of an attempt, version 3 the battles of the game and
    // the levels of its journey (§24). Version 2 is still accepted (section 3.7 of the plan).
    public const int VERSION = 3;

    /**
     * @return array<mixed>|null the attempt in the current format version, or null when the JSON is not
     *                           a finished attempt of a supported version
     */
    public function readAttempt(string $json): ?array;

    /**
     * @return array<mixed>|null the configuration, or null when the JSON is not a configuration of the mode
     *                           or the mode has no settings
     */
    public function readConfiguration(string $json, Mode $mode): ?array;
}
