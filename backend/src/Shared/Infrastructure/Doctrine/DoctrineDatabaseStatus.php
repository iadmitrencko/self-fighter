<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Doctrine;

use App\Shared\Application\DatabaseStatus;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception as DbalException;

final readonly class DoctrineDatabaseStatus implements DatabaseStatus
{
    public function __construct(private Connection $connection)
    {
    }

    public function isAvailable(): bool
    {
        try {
            $this->connection->executeQuery('SELECT 1');
        } catch (DbalException) {
            return false;
        }

        return true;
    }
}
