<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261114120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Attempts keep the battles of the game only, in format version 6: the old modes of the site and their ready-made challenges are gone';
    }

    public function up(Schema $schema): void
    {
        // The workouts of the old site, the fights of «Ціль» the game played before §6 among them.
        // Every battle that stays names its pool of energy.
        $this->addSql('DELETE FROM attempt WHERE mode NOT IN (\'fight\', \'campaign\', \'duel\') OR pool IS NULL OR energy_full_at IS NULL');
        // Version 6 drops the field of the ready-made challenge, which a battle of the game never filled.
        $this->addSql('UPDATE attempt SET document = JSON_SET(JSON_REMOVE(document, \'$.challenge\'), \'$.schemaVersion\', 6), schema_version = 6');
        $this->addSql('ALTER TABLE attempt CHANGE pool pool VARCHAR(8) NOT NULL, CHANGE energy_full_at energy_full_at DATETIME NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // The deleted workouts of the old site do not come back.
        $this->addSql('ALTER TABLE attempt CHANGE pool pool VARCHAR(8) DEFAULT NULL, CHANGE energy_full_at energy_full_at DATETIME DEFAULT NULL');
        $this->addSql('UPDATE attempt SET document = JSON_SET(document, \'$.challenge\', CAST(\'null\' AS JSON), \'$.schemaVersion\', 5), schema_version = 5');
    }
}
