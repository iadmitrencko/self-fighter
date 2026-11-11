<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261110160243 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The battles of the game and the levels of its journey: format version 3 (§24)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE attempt ADD pool VARCHAR(8) DEFAULT NULL, ADD level VARCHAR(80) DEFAULT NULL, ADD energy_full_at DATETIME DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_attempt_user_pool_outcome ON attempt (user_id, pool, outcome)');
        // Version 2 knew no game, so every saved attempt is a workout of the site.
        $this->addSql('UPDATE attempt SET schema_version = 3, document = JSON_SET(document, \'$.schemaVersion\', 3, \'$.game\', CAST(\'null\' AS JSON)) WHERE schema_version = 2');
    }

    public function down(Schema $schema): void
    {
        // Version 2 knows no game: a fight of the game becomes a workout of the site, and the levels
        // of the journey are lost.
        $this->addSql('DELETE FROM attempt WHERE mode = \'campaign\'');
        $this->addSql('UPDATE attempt SET schema_version = 2, document = JSON_SET(JSON_REMOVE(document, \'$.game\'), \'$.schemaVersion\', 2) WHERE schema_version = 3');
        $this->addSql('DROP INDEX idx_attempt_user_pool_outcome ON attempt');
        $this->addSql('ALTER TABLE attempt DROP pool, DROP level, DROP energy_full_at');
    }
}
