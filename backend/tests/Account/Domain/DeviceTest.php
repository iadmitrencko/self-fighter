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

    // Another account signs in on the browser. A token planted in it beforehand opens nothing afterwards.
    public function testSigningInChangesTheAccountAndTheToken(): void
    {
        $account = UserId::generate();
        $planted = DeviceToken::generate();
        $device = Device::register(UserId::generate(), $planted, new \DateTimeImmutable('2026-11-04 10:00:00'));
        $token = DeviceToken::generate();

        $device->signIn($account, $token, new \DateTimeImmutable('2026-11-04 10:05:00'));

        self::assertSame($account, $device->owner());
        self::assertSame('2026-11-04 10:05:00', $device->lastSeenAt()->format('Y-m-d H:i:s'));
        self::assertNotSame($planted->hash(), $token->hash());
    }
}
