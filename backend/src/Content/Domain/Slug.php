<?php

declare(strict_types=1);

namespace App\Content\Domain;

// Paths are English words joined by hyphens, such as /privacy (section 3.4 of the plan).
final class Slug
{
    public const string PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*';

    public static function check(string $slug): string
    {
        if (1 !== preg_match('/^'.self::PATTERN.'$/', $slug)) {
            throw new \InvalidArgumentException(\sprintf('"%s" is not a slug.', $slug));
        }

        return $slug;
    }
}
