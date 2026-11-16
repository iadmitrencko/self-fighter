<?php

declare(strict_types=1);

namespace App\Tests\Account\Infrastructure\Doctrine;

use App\Account\Application\DeleteUser;
use App\Account\Application\SignUpGuest;
use App\Shared\Application\Refusal;
use App\Shared\Application\RefusalReason;
use App\Tests\Workout\Documents;
use App\Workout\Application\SaveAttempt;
use App\Workout\Domain\AttemptId;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class DoctrineUserTransactionTest extends KernelTestCase
{
    // Modules keep no foreign keys to the user, so the lock on the user row is what stops a write
    // that arrives after the data was deleted in another tab.
    public function testWriteOfUserDeletedMeanwhileLeavesNothing(): void
    {
        $user = $this->service(SignUpGuest::class)()->user->id();
        $this->service(DeleteUser::class)($user);
        $attempt = Documents::fight();

        try {
            $this->service(SaveAttempt::class)($user, AttemptId::fromString((string) $attempt['id']), json_encode($attempt, \JSON_THROW_ON_ERROR));
            self::fail('A deleted user saved an attempt.');
        } catch (Refusal $refusal) {
            self::assertSame(RefusalReason::UserGone, $refusal->reason);
        }

        self::assertSame(0, (int) $this->service(Connection::class)->fetchOne('SELECT COUNT(*) FROM attempt'));
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $id
     *
     * @return T
     */
    private function service(string $id): object
    {
        $service = self::getContainer()->get($id);
        self::assertInstanceOf($id, $service);

        return $service;
    }
}
