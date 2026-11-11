<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\ExerciseRepository;
use App\Shared\Application\GameContent;

final readonly class ContentForGame implements GameContent
{
    public function __construct(private ExerciseRepository $exercises)
    {
    }

    public function exercises(): array
    {
        return array_map(
            static fn ($exercise): array => ['id' => $exercise->slug(), 'name' => $exercise->name()],
            $this->exercises->all(),
        );
    }
}
