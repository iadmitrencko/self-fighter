<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261102095706 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Users, their browsers and workout data (stage 4)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE attempt (id BINARY(16) NOT NULL, mode VARCHAR(20) NOT NULL, outcome VARCHAR(4) NOT NULL, schema_version SMALLINT NOT NULL, finished_at DATETIME NOT NULL, document JSON NOT NULL, user_id BINARY(16) NOT NULL, INDEX idx_attempt_user_finished_at (user_id, finished_at), INDEX idx_attempt_user_mode_finished_at (user_id, mode, finished_at), INDEX idx_attempt_user_outcome_finished_at (user_id, outcome, finished_at), INDEX IDX_18EC0266A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE custom_exercise (id BINARY(16) NOT NULL, name VARCHAR(60) NOT NULL, name_key VARCHAR(255) NOT NULL COLLATE `utf8mb4_bin`, description VARCHAR(200) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, user_id BINARY(16) NOT NULL, UNIQUE INDEX uniq_custom_exercise_user_name_key (user_id, name_key), INDEX IDX_4B083278A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE device (id BINARY(16) NOT NULL, token_hash CHAR(64) NOT NULL, created_at DATETIME NOT NULL, last_seen_at DATETIME NOT NULL, user_id BINARY(16) NOT NULL, INDEX idx_device_last_seen_at (last_seen_at), UNIQUE INDEX uniq_device_token_hash (token_hash), INDEX IDX_92FB68EA76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user (id BINARY(16) NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user_setting (name VARCHAR(32) NOT NULL, value JSON NOT NULL, updated_at DATETIME NOT NULL, user_id BINARY(16) NOT NULL, INDEX IDX_C779A692A76ED395 (user_id), PRIMARY KEY (user_id, name)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE attempt ADD CONSTRAINT FK_18EC0266A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE custom_exercise ADD CONSTRAINT FK_4B083278A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE device ADD CONSTRAINT FK_92FB68EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_setting ADD CONSTRAINT FK_C779A692A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE attempt DROP FOREIGN KEY FK_18EC0266A76ED395');
        $this->addSql('ALTER TABLE custom_exercise DROP FOREIGN KEY FK_4B083278A76ED395');
        $this->addSql('ALTER TABLE device DROP FOREIGN KEY FK_92FB68EA76ED395');
        $this->addSql('ALTER TABLE user_setting DROP FOREIGN KEY FK_C779A692A76ED395');
        $this->addSql('DROP TABLE attempt');
        $this->addSql('DROP TABLE custom_exercise');
        $this->addSql('DROP TABLE device');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE user_setting');
    }
}
