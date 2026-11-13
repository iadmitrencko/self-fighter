<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261113090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The duel with the King of robbers (§24.9): attempts move to version 5';
    }

    public function up(Schema $schema): void
    {
        // Version 5 only adds the duel, so the attempts saved before change the number alone.
        $this->addSql('UPDATE attempt SET schema_version = 5, document = JSON_SET(document, \'$.schemaVersion\', 5) WHERE schema_version < 5');
    }

    public function down(Schema $schema): void
    {
        // Version 4 knows no duel: its battles go, and the King has his health back.
        $this->addSql('DELETE FROM attempt WHERE mode = \'duel\'');
        $this->addSql('UPDATE attempt SET schema_version = 4, document = JSON_SET(document, \'$.schemaVersion\', 4) WHERE schema_version = 5');
    }
}
