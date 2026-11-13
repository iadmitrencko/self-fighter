<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261112170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The server keeps the energy of the game (§24.4): every attempt keeps the moment it started';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE attempt ADD started_at DATETIME DEFAULT NULL');
        // The document has always kept it as Date.prototype.toISOString() writes it. The column keeps
        // whole seconds, as the server writes them, so the milliseconds go rather than round.
        $this->addSql('UPDATE attempt SET started_at = STR_TO_DATE(LEFT(document->>\'$.startedAt\', 19), \'%Y-%m-%dT%H:%i:%s\')');
        $this->addSql('ALTER TABLE attempt MODIFY started_at DATETIME NOT NULL');
        $this->addSql('CREATE INDEX idx_attempt_user_pool_started_at ON attempt (user_id, pool, started_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_attempt_user_pool_started_at ON attempt');
        $this->addSql('ALTER TABLE attempt DROP started_at');
    }
}
