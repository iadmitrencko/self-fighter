<?php

declare(strict_types=1);

namespace App\Tests\Account\Domain;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceToken;
use App\Shared\Domain\UserId;
use PHPUnit\Framework\TestCase;

final class DeviceTest extends TestCase
{
    public function testIsRenewedAtMostOnceADay(): void
    {
        $device = Device::register(UserId::generate(), DeviceToken::generate(), new \DateTimeImmutable('2026-11-02 10:00:00'));

        self::assertFalse($device->isDueForRenewal(new \DateTimeImmutable('2026-11-03 09:59:59')));
        self::assertTrue($device->isDueForRenewal(new \DateTimeImmutable('2026-11-03 10:00:00')));

        $device->markSeen(new \DateTimeImmutable('2026-11-03 10:00:00'));

        self::assertFalse($device->isDueForRenewal(new \DateTimeImmutable('2026-11-03 10:00:01')));
    }
}
