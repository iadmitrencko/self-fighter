<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * A page about the site written in Markdown, such as «Про проєкт».
 */
final class Page
{
    private string $slug;

    public function __construct(
        private PageType $type,
        string $slug,
        private int $position,
        private Article $article,
        private bool $reviewed,
        private \DateTimeImmutable $updatedAt,
    ) {
        $this->slug = Slug::check($slug);
    }

    public function type(): PageType
    {
        return $this->type;
    }

    public function slug(): string
    {
        return $this->slug;
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
