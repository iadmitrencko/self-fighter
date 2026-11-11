<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Files;

/**
 * Fields written in YAML, such as the block at the top of a content file or an exercise of
 * exercises.yaml, read field by field with the types the site needs.
 */
final readonly class FrontMatter
{
    /**
     * @param array<mixed> $fields
     */
    public function __construct(private array $fields)
    {
    }

    public function string(string $key): string
    {
        $value = $this->fields[$key] ?? null;

        if (!\is_string($value) || '' === trim($value)) {
            throw new \InvalidArgumentException(\sprintf('"%s" must be a text.', $key));
        }

        return trim($value);
    }

    public function int(string $key): int
    {
        $value = $this->fields[$key] ?? null;

        if (!\is_int($value)) {
            throw new \InvalidArgumentException(\sprintf('"%s" must be a whole number.', $key));
        }

        return $value;
    }

    public function bool(string $key): bool
    {
        $value = $this->fields[$key] ?? null;

        if (!\is_bool($value)) {
            throw new \InvalidArgumentException(\sprintf('"%s" must be true or false.', $key));
        }

        return $value;
    }

    // YAML reads an unquoted 2026-11-03 as a timestamp, a quoted one as a text.
    public function date(string $key): \DateTimeImmutable
    {
        $value = $this->fields[$key] ?? null;
        $date = match (true) {
            \is_int($value) => new \DateTimeImmutable('@'.$value),
            \is_string($value) => \DateTimeImmutable::createFromFormat('!Y-m-d', $value, new \DateTimeZone('UTC')),
            default => false,
        };

        if (false === $date) {
            throw new \InvalidArgumentException(\sprintf('"%s" must be a date like 2026-11-03.', $key));
        }

        return $date;
    }
}
