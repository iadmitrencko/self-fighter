<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\ExerciseRepository;
use App\Shared\Application\GameContent;

final readonly class ContentForGame implements GameContent
{
    public function __construct(private ExerciseRepository $exercises, private ChallengeRepository $challenges)
    {
    }

    public function exercises(): array
    {
        $exercises = [];

        foreach ($this->exercises->all() as $exercise) {
            if ($exercise->inGame()) {
                $exercises[] = ['id' => $exercise->slug(), 'name' => $exercise->name()];
            }
        }

        return $exercises;
    }

    public function challenge(string $slug): ?array
    {
        $challenge = $this->challenges->find($slug);

        return null === $challenge ? null : [
            'slug' => $challenge->slug(),
            'title' => $challenge->article()->heading,
            'config' => $challenge->config(),
        ];
    }
}
