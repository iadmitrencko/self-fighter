<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261103091203 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Attempts remember their ready-made challenge: format version 2';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE attempt ADD challenge VARCHAR(80) DEFAULT NULL');
        // Version 1 knew no challenges, so every saved attempt took the settings of the player.
        $this->addSql('UPDATE attempt SET schema_version = 2, document = JSON_SET(document, \'$.schemaVersion\', 2, \'$.challenge\', CAST(\'null\' AS JSON)) WHERE schema_version = 1');
    }

    public function down(Schema $schema): void
    {
        // Version 1 cannot name a challenge: that part of the history is lost.
        $this->addSql('UPDATE attempt SET schema_version = 1, document = JSON_SET(JSON_REMOVE(document, \'$.challenge\'), \'$.schemaVersion\', 1) WHERE schema_version = 2');
        $this->addSql('ALTER TABLE attempt DROP challenge');
    }
}
