<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261103081120 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The content of the site: exercises, pages and ready-made challenges';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE challenge (mode VARCHAR(20) NOT NULL, exercises JSON NOT NULL, level VARCHAR(10) NOT NULL, demand VARCHAR(12) NOT NULL, config JSON NOT NULL, program JSON NOT NULL, stages INT NOT NULL, total_reps INT NOT NULL, easier VARCHAR(80) DEFAULT NULL, harder VARCHAR(80) DEFAULT NULL, related JSON NOT NULL, position INT NOT NULL, note LONGTEXT NOT NULL, reviewed TINYINT NOT NULL, updated_at DATETIME NOT NULL, slug VARCHAR(80) NOT NULL, title VARCHAR(60) NOT NULL, description VARCHAR(155) NOT NULL, heading VARCHAR(160) NOT NULL, lead_text LONGTEXT NOT NULL, html MEDIUMTEXT NOT NULL, PRIMARY KEY (slug)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE content_page (position INT NOT NULL, reviewed TINYINT NOT NULL, updated_at DATETIME NOT NULL, type VARCHAR(16) NOT NULL, slug VARCHAR(80) NOT NULL, title VARCHAR(60) NOT NULL, description VARCHAR(155) NOT NULL, heading VARCHAR(160) NOT NULL, lead_text LONGTEXT NOT NULL, html MEDIUMTEXT NOT NULL, PRIMARY KEY (type, slug)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE exercise (name VARCHAR(60) NOT NULL, in_game TINYINT NOT NULL, position INT NOT NULL, reviewed TINYINT NOT NULL, updated_at DATETIME NOT NULL, slug VARCHAR(80) NOT NULL, title VARCHAR(60) NOT NULL, description VARCHAR(155) NOT NULL, heading VARCHAR(160) NOT NULL, lead_text LONGTEXT NOT NULL, html MEDIUMTEXT NOT NULL, PRIMARY KEY (slug)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE challenge');
        $this->addSql('DROP TABLE content_page');
        $this->addSql('DROP TABLE exercise');
    }
}
