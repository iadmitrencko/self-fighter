<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261104090738 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Signing in with Google: ways to sign in, the profile of an account and the guest a browser keeps (stage 9)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_identity (user_id BINARY(16) NOT NULL, created_at DATETIME NOT NULL, provider VARCHAR(16) NOT NULL, subject VARCHAR(255) NOT NULL COLLATE `utf8mb4_bin`, INDEX idx_user_identity_user_id (user_id), PRIMARY KEY (provider, subject)) DEFAULT CHARACTER SET utf8mb4');
        // Every browser so far leads to a guest, so none of them keeps another one.
        $this->addSql('ALTER TABLE device ADD guest_id BINARY(16) DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_device_guest_id ON device (guest_id)');
        $this->addSql('ALTER TABLE user ADD email VARCHAR(254) DEFAULT NULL, ADD name VARCHAR(100) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // An account without its way to sign in stays the guest of every browser it is open in. The
        // guests the browsers kept beside it lose their way back and go with the next purge.
        $this->addSql('DROP TABLE user_identity');
        $this->addSql('DROP INDEX idx_device_guest_id ON device');
        $this->addSql('ALTER TABLE device DROP guest_id');
        $this->addSql('ALTER TABLE user DROP email, DROP name');
    }
}
