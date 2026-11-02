<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Doctrine;

use App\Shared\Application\Transaction;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineTransaction implements Transaction
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function run(callable $change): mixed
    {
        return $this->entityManager->wrapInTransaction(static fn (): mixed => $change());
    }
}
