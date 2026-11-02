<?php

declare(strict_types=1);

namespace App\Tests\Account\Domain;

use App\Account\Domain\DeviceToken;
use PHPUnit\Framework\TestCase;

final class DeviceTokenTest extends TestCase
{
    public function testHolds256RandomBitsSafeForACookie(): void
    {
        $token = DeviceToken::generate();

        self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $token->value);
        self::assertNotSame($token->value, DeviceToken::generate()->value);
    }

    // The database keeps only the hash, so a copy of it signs nobody in.
    public function testIsStoredAsItsHash(): void
    {
        $token = DeviceToken::generate();

        self::assertSame(hash('sha256', $token->value), $token->hash());
        self::assertSame($token->hash(), DeviceToken::tryFrom($token->value)?->hash());
    }

    public function testRefusesCookiesItCouldNotHaveIssued(): void
    {
        self::assertNull(DeviceToken::tryFrom(str_repeat('a', 42)));
        self::assertNull(DeviceToken::tryFrom(str_repeat('a', 42).'='));
        self::assertNull(DeviceToken::tryFrom(str_repeat('a', 43)."\n"));
    }
}
