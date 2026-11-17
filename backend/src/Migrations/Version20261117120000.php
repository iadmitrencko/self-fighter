<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261117120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The player may name the cossack, a guest too (§24.11)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD nickname VARCHAR(40) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP nickname');
    }
}
