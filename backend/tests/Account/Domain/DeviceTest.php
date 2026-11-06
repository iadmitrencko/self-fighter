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

    // A token planted in the browser before signing in opens nothing afterwards.
    public function testSigningInChangesTheUserAndTheToken(): void
    {
        $guest = UserId::generate();
        $account = UserId::generate();
        $planted = DeviceToken::generate();
        $device = Device::register($guest, $planted, new \DateTimeImmutable('2026-11-04 10:00:00'));
        $token = DeviceToken::generate();

        $device->signIn($account, $guest, $token, new \DateTimeImmutable('2026-11-04 10:05:00'));

        self::assertSame([$account, $guest], [$device->owner(), $device->guest()]);
        self::assertSame('2026-11-04 10:05:00', $device->lastSeenAt()->format('Y-m-d H:i:s'));
        self::assertNotSame($planted->hash(), $token->hash());
    }

    public function testSigningOutBringsBackTheGuest(): void
    {
        $guest = UserId::generate();
        $device = Device::register(UserId::generate(), DeviceToken::generate(), new \DateTimeImmutable());
        $device->signIn(UserId::generate(), $guest, DeviceToken::generate(), new \DateTimeImmutable());

        self::assertTrue($device->signOut(DeviceToken::generate(), new \DateTimeImmutable()));
        self::assertSame([$guest, null], [$device->owner(), $device->guest()]);
        // Without a guest the device has nobody left to lead to.
        self::assertFalse($device->signOut(DeviceToken::generate(), new \DateTimeImmutable()));
        self::assertFalse($device->fallBackToGuest());
    }
}
