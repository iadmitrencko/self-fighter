<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Files;

/**
 * One entry of challenges/generated.json, read field by field.
 */
final readonly class GeneratedChallenge
{
    /**
     * @var array<mixed>
     */
    private array $fields;

    public function __construct(mixed $entry)
    {
        if (!\is_array($entry)) {
            throw new \InvalidArgumentException('A challenge must be an object.');
        }
        $this->fields = $entry;
    }

    public function string(string $key): string
    {
        $value = $this->value($key);

        if (!\is_string($value) || '' === $value) {
            throw new \InvalidArgumentException(\sprintf('"%s" of %s must be a text.', $key, $this->name()));
        }

        return $value;
    }

    public function optionalString(string $key): ?string
    {
        return null === $this->value($key) ? null : $this->string($key);
    }

    public function int(string $key): int
    {
        $value = $this->value($key);

        if (!\is_int($value)) {
            throw new \InvalidArgumentException(\sprintf('"%s" of %s must be a whole number.', $key, $this->name()));
        }

        return $value;
    }

    /**
     * @return list<string>
     */
    public function strings(string $key): array
    {
        $value = $this->value($key);

        if (!\is_array($value) || !array_is_list($value) || [] !== array_filter($value, static fn ($item): bool => !\is_string($item))) {
            throw new \InvalidArgumentException(\sprintf('"%s" of %s must be a list of texts.', $key, $this->name()));
        }

        return $value;
    }

    /**
     * @return array<string, mixed>
     */
    public function map(string $key): array
    {
        $value = $this->value($key);

        if (!\is_array($value) || array_is_list($value)) {
            throw new \InvalidArgumentException(\sprintf('"%s" of %s must be an object.', $key, $this->name()));
        }

        return $value;
    }

    public function date(string $key): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $this->string($key), new \DateTimeZone('UTC'));

        if (false === $date) {
            throw new \InvalidArgumentException(\sprintf('"%s" of %s must be a date like 2026-11-03.', $key, $this->name()));
        }

        return $date;
    }

    private function value(string $key): mixed
    {
        return $this->fields[$key] ?? null;
    }

    private function name(): string
    {
        $slug = $this->value('slug');

        return \is_string($slug) ? \sprintf('challenge "%s"', $slug) : 'a challenge';
    }
}
