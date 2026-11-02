<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Infrastructure\Doctrine\Uuid7Type;
use App\Workout\Domain\AttemptId;

final class AttemptIdType extends Uuid7Type
{
    public const string NAME = 'attempt_id';

    protected function idClass(): string
    {
        return AttemptId::class;
    }
}
