<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261102110736 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Modules refer to users by id only, and the settings of a user take one row';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE workout_settings (configurations JSON NOT NULL, updated_at DATETIME NOT NULL, user_id BINARY(16) NOT NULL, PRIMARY KEY (user_id)) DEFAULT CHARACTER SET utf8mb4');
        // One row per user instead of one per mode: {"ladder": {...}, "target": {...}}.
        $this->addSql('INSERT INTO workout_settings (user_id, configurations, updated_at) SELECT user_id, JSON_OBJECTAGG(name, value), MAX(updated_at) FROM user_setting GROUP BY user_id');
        $this->addSql('ALTER TABLE user_setting DROP FOREIGN KEY `FK_C779A692A76ED395`');
        $this->addSql('DROP TABLE user_setting');
        $this->addSql('ALTER TABLE attempt DROP FOREIGN KEY `FK_18EC0266A76ED395`');
        $this->addSql('DROP INDEX IDX_18EC0266A76ED395 ON attempt');
        $this->addSql('ALTER TABLE custom_exercise DROP FOREIGN KEY `FK_4B083278A76ED395`');
        $this->addSql('DROP INDEX IDX_4B083278A76ED395 ON custom_exercise');
        $this->addSql('ALTER TABLE device DROP FOREIGN KEY `FK_92FB68EA76ED395`');
        $this->addSql('ALTER TABLE device RENAME INDEX idx_92fb68ea76ed395 TO idx_device_user_id');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_setting (name VARCHAR(32) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_0900_ai_ci`, value JSON NOT NULL, updated_at DATETIME NOT NULL, user_id BINARY(16) NOT NULL, INDEX IDX_C779A692A76ED395 (user_id), PRIMARY KEY (user_id, name)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_0900_ai_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE user_setting ADD CONSTRAINT `FK_C779A692A76ED395` FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('INSERT INTO user_setting (user_id, name, value, updated_at) SELECT s.user_id, m.name, JSON_EXTRACT(s.configurations, CONCAT(\'$."\', m.name, \'"\')), s.updated_at FROM workout_settings s, JSON_TABLE(JSON_KEYS(s.configurations), \'$[*]\' COLUMNS (name VARCHAR(32) PATH \'$\')) m');
        $this->addSql('DROP TABLE workout_settings');
        $this->addSql('ALTER TABLE attempt ADD CONSTRAINT `FK_18EC0266A76ED395` FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_18EC0266A76ED395 ON attempt (user_id)');
        $this->addSql('ALTER TABLE custom_exercise ADD CONSTRAINT `FK_4B083278A76ED395` FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_4B083278A76ED395 ON custom_exercise (user_id)');
        $this->addSql('ALTER TABLE device ADD CONSTRAINT `FK_92FB68EA76ED395` FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE device RENAME INDEX idx_device_user_id TO IDX_92FB68EA76ED395');
    }
}
