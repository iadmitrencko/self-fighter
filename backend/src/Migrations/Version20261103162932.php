<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261103162932 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The analytics events of §19, sent only with consent';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE analytics_event (name VARCHAR(32) NOT NULL, mode VARCHAR(20) NOT NULL, outcome VARCHAR(4) DEFAULT NULL, error VARCHAR(40) DEFAULT NULL, user_id BINARY(16) DEFAULT NULL, occurred_at DATETIME NOT NULL, id BINARY(16) NOT NULL, INDEX idx_analytics_event_user_name_occurred_at (user_id, name, occurred_at), INDEX idx_analytics_event_name_occurred_at (name, occurred_at), INDEX idx_analytics_event_occurred_at (occurred_at), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE analytics_event');
    }
}
