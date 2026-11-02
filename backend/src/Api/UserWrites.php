<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\User;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Every change of a user's data goes through here.
 */
final readonly class UserWrites
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private RateLimiterFactoryInterface $apiWriteLimiter,
    ) {
    }

    /**
     * Runs the change in a transaction that first locks the user row. Changes of one user then
     * happen one at a time, so two tabs cannot both create the same record.
     *
     * @template T
     *
     * @param callable(): T $change
     *
     * @return T
     */
    public function run(User $user, callable $change): mixed
    {
        $limit = $this->apiWriteLimiter->create($user->getUserIdentifier())->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }

        return $this->entityManager->wrapInTransaction(function () use ($user, $change): mixed {
            $this->entityManager->lock($user, LockMode::PESSIMISTIC_WRITE);

            return $change();
        });
    }
}
