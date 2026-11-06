<?php

declare(strict_types=1);

namespace App\Tests\Account\Domain;

use App\Account\Domain\User;
use App\Shared\Domain\UserId;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testGuestHasNoProfile(): void
    {
        $user = User::signUp(UserId::generate(), new \DateTimeImmutable('2026-11-04 10:00:00.5'));

        self::assertSame([null, null], [$user->email(), $user->name()]);
        self::assertSame('2026-11-04 10:00:00.000000', $user->createdAt()->format('Y-m-d H:i:s.u'));
    }

    // Every sign-in brings the current profile from Google.
    public function testKeepsTheLatestProfile(): void
    {
        $user = User::signUp(UserId::generate(), new \DateTimeImmutable());

        $user->rememberProfile('olena@example.com', 'Олена');
        $user->rememberProfile(" olena.koval@example.com\n", "Олена\u{200B} Коваль ");

        self::assertSame(['olena.koval@example.com', 'Олена Коваль'], [$user->email(), $user->name()]);
    }

    public function testDropsWhatIsNoProfile(): void
    {
        $user = User::signUp(UserId::generate(), new \DateTimeImmutable());

        $user->rememberProfile('not an address', '   ');
        self::assertSame([null, null], [$user->email(), $user->name()]);

        $user->rememberProfile(str_repeat('a', 250).'@b.ua', str_repeat('я', 150));
        self::assertNull($user->email());
        self::assertSame(User::NAME_MAX, mb_strlen((string) $user->name()));
    }
}
