<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * A ready-made exercise (§5.1): its page and, when the game offers it, its place in the catalog
 * of the game. Attempts keep the slug as the id of the exercise.
 */
final class Exercise
{
    private string $slug;

    public function __construct(
        string $slug,
        private string $name,
        private bool $inGame,
        private int $position,
        private Article $article,
        private bool $reviewed,
        private \DateTimeImmutable $updatedAt,
    ) {
        $this->slug = Slug::check($slug);
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function inGame(): bool
    {
        return $this->inGame;
    }

    public function position(): int
    {
        return $this->position;
    }

    public function article(): Article
    {
        return $this->article;
    }

    // §21.4: search engines see only texts a person has read.
    public function indexable(): bool
    {
        return $this->reviewed;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
