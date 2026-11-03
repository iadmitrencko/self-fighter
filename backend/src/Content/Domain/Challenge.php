<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * A ready-made challenge (§21.3): a configuration of the game generated from the matrix,
 * its whole program and the text written about it.
 */
final class Challenge
{
    private string $slug;

    /**
     * @param list<string>         $exercises the slugs of its exercises
     * @param array<string, mixed> $config    the configuration of the game, valid by §11.5
     * @param array<string, mixed> $program   the stages or the rounds as the page shows them
     * @param list<string>         $related   slugs of challenges worth trying next
     * @param string               $note      the text about this challenge alone, rendered from Markdown
     */
    public function __construct(
        string $slug,
        private string $mode,
        private array $exercises,
        private Level $level,
        private Demand $demand,
        private array $config,
        private array $program,
        private int $stages,
        private int $totalReps,
        private ?string $easier,
        private ?string $harder,
        private array $related,
        private int $position,
        private Article $article,
        private string $note,
        private bool $reviewed,
        private \DateTimeImmutable $updatedAt,
    ) {
        $this->slug = Slug::check($slug);
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function mode(): string
    {
        return $this->mode;
    }

    /**
     * @return list<string>
     */
    public function exercises(): array
    {
        return $this->exercises;
    }

    public function level(): Level
    {
        return $this->level;
    }

    public function demand(): Demand
    {
        return $this->demand;
    }

    /**
     * @return array<string, mixed>
     */
    public function config(): array
    {
        return $this->config;
    }

    /**
     * @return array<string, mixed>
     */
    public function program(): array
    {
        return $this->program;
    }

    public function stages(): int
    {
        return $this->stages;
    }

    public function totalReps(): int
    {
        return $this->totalReps;
    }

    public function easier(): ?string
    {
        return $this->easier;
    }

    public function harder(): ?string
    {
        return $this->harder;
    }

    /**
     * @return list<string>
     */
    public function related(): array
    {
        return $this->related;
    }

    public function position(): int
    {
        return $this->position;
    }

    public function article(): Article
    {
        return $this->article;
    }

    public function note(): string
    {
        return $this->note;
    }

    /**
     * §21.4: a challenge is indexed only with a text of its own that a person has read, and only
     * when people search for it or the catalog needs it. The rest stays in the catalog with noindex.
     */
    public function indexable(): bool
    {
        return $this->reviewed && '' !== trim($this->note) && Demand::Unverified !== $this->demand;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
