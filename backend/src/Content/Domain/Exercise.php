<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * A ready-made exercise of the game (§5.1) and its place in the catalog. Attempts keep the slug as
 * the id of the exercise.
 */
final class Exercise
{
    private string $slug;

    public function __construct(
        string $slug,
        private string $name,
        private int $position,
    ) {
        $this->slug = Slug::check($slug);

        if ('' === trim($name)) {
            throw new \InvalidArgumentException(\sprintf('The exercise %s has no name.', $slug));
        }
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function position(): int
    {
        return $this->position;
    }
}
