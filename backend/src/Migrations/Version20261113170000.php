<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261113170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'The guides of the site are gone (§21.2 of the specification)';
    }

    public function up(Schema $schema): void
    {
        // The site no longer knows the type of these pages, so it could not read them back.
        $this->addSql('DELETE FROM content_page WHERE type = \'guide\'');
    }

    public function down(Schema $schema): void
    {
        // The guides come back with the content of that version: app:content:sync writes them anew.
    }
}
