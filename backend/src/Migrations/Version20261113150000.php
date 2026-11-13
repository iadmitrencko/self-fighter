<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261113150000 extends AbstractMigration
{
    // The slug of a ready-made exercise never changes, so an attempt knows the exercise by it.
    private const string EXERCISE = 'push-ups';

    public function getDescription(): string
    {
        return 'Attempts saved before call the ready-made exercise push-ups «Відтискання», as the catalog does';
    }

    public function up(Schema $schema): void
    {
        $this->rename('Віджимання', 'Відтискання');
    }

    public function down(Schema $schema): void
    {
        $this->rename('Відтискання', 'Віджимання');
    }

    /**
     * Attempts keep a copy of the name wherever they mention the exercise, and the place differs
     * from one mode and version of the format to another, so the whole document is searched.
     */
    private function rename(string $from, string $to): void
    {
        $attempts = $this->connection->iterateAssociative(
            'SELECT HEX(id) AS id, document FROM attempt WHERE JSON_SEARCH(document, \'one\', ?) IS NOT NULL',
            [$from],
        );

        foreach ($attempts as $attempt) {
            $document = json_decode((string) $attempt['document'], flags: \JSON_THROW_ON_ERROR);
            self::renameIn($document, $from, $to);
            $this->addSql('UPDATE attempt SET document = ? WHERE id = UNHEX(?)', [
                json_encode($document, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES | \JSON_PRESERVE_ZERO_FRACTION),
                $attempt['id'],
            ]);
        }
    }

    // A custom exercise has an id of its own, so one that a player named the same keeps its name.
    private static function renameIn(mixed $value, string $from, string $to): void
    {
        if ($value instanceof \stdClass) {
            if (self::EXERCISE === ($value->id ?? null) && $from === ($value->name ?? null)) {
                $value->name = $to;
            }
            $value = get_object_vars($value);
        }

        if (\is_array($value)) {
            foreach ($value as $item) {
                self::renameIn($item, $from, $to);
            }
        }
    }
}
