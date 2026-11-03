<?php

declare(strict_types=1);

namespace App\Analytics\Infrastructure\Doctrine;

use App\Analytics\Domain\EventId;
use App\Shared\Infrastructure\Doctrine\Uuid7Type;

final class EventIdType extends Uuid7Type
{
    public const string NAME = 'event_id';

    protected function idClass(): string
    {
        return EventId::class;
    }
}
