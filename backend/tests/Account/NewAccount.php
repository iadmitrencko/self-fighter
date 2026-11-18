<?php

declare(strict_types=1);

namespace App\Tests\Account;

use App\Account\Application\ExternalIdentity;
use App\Account\Application\SignIn;
use App\Account\Domain\DeviceToken;
use App\Account\Domain\IdentityProvider;
use App\Shared\Domain\UserId;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\Assert;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A person signs in with Google for the first time on a new browser: the account the game needs
 * (§23.1) and the token of its browser.
 */
final readonly class NewAccount
{
    private function __construct(
        public UserId $user,
        public DeviceToken $token,
    ) {
    }

    public static function signUp(ContainerInterface $container, ?string $subject = null): self
    {
        $subject ??= 'sub-'.bin2hex(random_bytes(8));
        $signIn = $container->get(SignIn::class);
        Assert::assertInstanceOf(SignIn::class, $signIn);
        $token = $signIn(new ExternalIdentity(IdentityProvider::Google, $subject, null, null), null);

        $connection = $container->get(Connection::class);
        Assert::assertInstanceOf(Connection::class, $connection);
        $id = $connection->fetchOne('SELECT user_id FROM user_identity WHERE subject = ?', [$subject]);
        Assert::assertIsString($id);

        return new self(UserId::fromBytes($id), $token);
    }
}
