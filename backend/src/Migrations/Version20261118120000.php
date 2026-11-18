<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118120000 extends AbstractMigration
{
    // A user without a way to sign in is a guest of the time when the game needed no account.
    private const string GUESTS = 'SELECT id FROM user WHERE id NOT IN (SELECT user_id FROM user_identity)';

    public function getDescription(): string
    {
        return 'The game needs an account (§23.1): the guests go with their data, and a browser keeps no guest any more';
    }

    public function up(Schema $schema): void
    {
        // §15.5: the events of a deleted user stay in the numbers of §19 without the user.
        $this->addSql(\sprintf('UPDATE analytics_event SET user_id = NULL WHERE user_id IN (%s)', self::GUESTS));

        foreach (['attempt', 'custom_exercise', 'workout_settings', 'device'] as $table) {
            $this->addSql(\sprintf('DELETE FROM %s WHERE user_id IN (%s)', $table, self::GUESTS));
        }

        $this->addSql('DELETE FROM user WHERE id NOT IN (SELECT user_id FROM user_identity)');
        $this->addSql('DROP INDEX idx_device_guest_id ON device');
        $this->addSql('ALTER TABLE device DROP guest_id');
    }

    // The guests and their data are gone for good: only the column comes back.
    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE device ADD guest_id BINARY(16) DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_device_guest_id ON device (guest_id)');
    }
}
