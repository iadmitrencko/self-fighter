<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Doctrine;

use App\Shared\Domain\UserId;

final class UserIdType extends Uuid7Type
{
    public const string NAME = 'user_id';

    protected function idClass(): string
    {
        return UserId::class;
    }
}
