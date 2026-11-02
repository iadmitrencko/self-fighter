<?php

declare(strict_types=1);

namespace App\Workout\Domain;

/**
 * The editable part of a custom exercise, cleaned up the same way as exercise.ts does it in the browser.
 */
final readonly class ExerciseDetails
{
    public const int NAME_MAX = 60;
    public const int DESCRIPTION_MAX = 200;

    private function __construct(
        public string $name,
        public string $nameKey,
        public string $description,
    ) {
    }

    public static function tryFrom(string $name, string $description): ?self
    {
        $name = self::clean($name);
        $description = self::clean($description);

        if ('' === $name || mb_strlen($name) > self::NAME_MAX || mb_strlen($description) > self::DESCRIPTION_MAX) {
            return null;
        }

        return new self($name, mb_strtolower($name), $description);
    }

    // Trims the same characters as String.prototype.trim() and composes letters with their accents.
    private static function clean(string $text): string
    {
        $trimmed = preg_replace('/^[\s\p{Z}\x{FEFF}]+|[\s\p{Z}\x{FEFF}]+$/u', '', $text);

        return \is_string($trimmed) ? (string) \Normalizer::normalize($trimmed, \Normalizer::FORM_C) : '';
    }
}
