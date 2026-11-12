<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261111180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'A fight is put together freely (§6): attempts move to version 4, the settings of the old modes go';
    }

    public function up(Schema $schema): void
    {
        // Version 4 keeps the old modes as they were, so their attempts only change the number.
        $this->addSql('UPDATE attempt SET schema_version = 4, document = JSON_SET(document, \'$.schemaVersion\', 4) WHERE schema_version < 4');
        // The old modes start no more, so their last settings lead nowhere.
        $this->addSql('UPDATE workout_settings SET configurations = JSON_REMOVE(configurations, \'$.target\', \'$."random-opponent"\', \'$."opponent-levels"\', \'$.ladder\')');
        $this->addSql('DELETE FROM workout_settings WHERE JSON_LENGTH(configurations) = 0');
    }

    public function down(Schema $schema): void
    {
        // Version 3 knows no such fight: its attempts and settings go, the settings of the old modes do not come back.
        $this->addSql('DELETE FROM attempt WHERE mode = \'fight\'');
        $this->addSql('UPDATE attempt SET schema_version = 3, document = JSON_SET(document, \'$.schemaVersion\', 3) WHERE schema_version = 4');
        $this->addSql('UPDATE workout_settings SET configurations = JSON_REMOVE(configurations, \'$.fight\')');
        $this->addSql('DELETE FROM workout_settings WHERE JSON_LENGTH(configurations) = 0');
    }
}
