<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Doctrine;

use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;

// Account keeps the user rows, so it provides the lock every module writes under.
final readonly class DoctrineUserTransaction implements UserTransaction
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function run(UserId $user, callable $change): mixed
    {
        try {
            return $this->entityManager->wrapInTransaction(function () use ($user, $change): mixed {
                // Another change of the user waits for this row. A missing row means the user was deleted meanwhile.
                $found = $this->entityManager->getConnection()->fetchOne(
                    'SELECT 1 FROM user WHERE id = ? FOR UPDATE',
                    [$user],
                    [UserIdType::NAME],
                );

                if (false === $found) {
                    throw Refusal::userGone();
                }

                return $change();
            });
        } catch (UniqueConstraintViolationException) {
            // Another user saved a record with the same id at the same moment.
            throw Refusal::conflict('conflict');
        }
    }
}
