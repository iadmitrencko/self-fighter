<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261111130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Everything for the game (§24.1): no ready-made challenges, no pages of the modes and of the exercises';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE challenge');
        $this->addSql('DELETE FROM content_page WHERE type = \'mode\'');
        // The exercises stay as the catalog of the game, without the texts of their pages.
        $this->addSql('ALTER TABLE exercise DROP in_game, DROP reviewed, DROP updated_at, DROP title, DROP description, DROP heading, DROP lead_text, DROP html');
        // An attempt keeps its challenge in the document, as the format says; nothing counts it any more.
        $this->addSql('ALTER TABLE attempt DROP challenge');
    }

    public function down(Schema $schema): void
    {
        // The challenge of an attempt comes back from its document. The challenges, the pages of the
        // modes and the texts of the exercises come back with app:content:sync of that release.
        $this->addSql('ALTER TABLE attempt ADD challenge VARCHAR(80) DEFAULT NULL');
        $this->addSql('UPDATE attempt SET challenge = JSON_UNQUOTE(JSON_EXTRACT(document, \'$.challenge.slug\')) WHERE JSON_EXTRACT(document, \'$.challenge.slug\') IS NOT NULL');
        $this->addSql('DELETE FROM exercise');
        $this->addSql('ALTER TABLE exercise ADD in_game TINYINT NOT NULL, ADD reviewed TINYINT NOT NULL, ADD updated_at DATETIME NOT NULL, ADD title VARCHAR(60) NOT NULL, ADD description VARCHAR(155) NOT NULL, ADD heading VARCHAR(160) NOT NULL, ADD lead_text LONGTEXT NOT NULL, ADD html MEDIUMTEXT NOT NULL');
        $this->addSql('CREATE TABLE challenge (mode VARCHAR(20) NOT NULL, exercises JSON NOT NULL, level VARCHAR(10) NOT NULL, demand VARCHAR(12) NOT NULL, config JSON NOT NULL, program JSON NOT NULL, stages INT NOT NULL, total_reps INT NOT NULL, easier VARCHAR(80) DEFAULT NULL, harder VARCHAR(80) DEFAULT NULL, related JSON NOT NULL, position INT NOT NULL, note LONGTEXT NOT NULL, reviewed TINYINT NOT NULL, updated_at DATETIME NOT NULL, slug VARCHAR(80) NOT NULL, title VARCHAR(60) NOT NULL, description VARCHAR(155) NOT NULL, heading VARCHAR(160) NOT NULL, lead_text LONGTEXT NOT NULL, html MEDIUMTEXT NOT NULL, PRIMARY KEY (slug)) DEFAULT CHARACTER SET utf8mb4');
    }
}
