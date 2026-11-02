<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Doctrine;

use App\Account\Domain\DeviceId;
use App\Shared\Infrastructure\Doctrine\Uuid7Type;

final class DeviceIdType extends Uuid7Type
{
    public const string NAME = 'device_id';

    protected function idClass(): string
    {
        return DeviceId::class;
    }
}
