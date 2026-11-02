<?php

declare(strict_types=1);

namespace App\Shared\Domain;

/**
 * An identifier in the UUID v7 form (RFC 9562). The browser creates the ids of attempts and
 * custom exercises the same way, so a repeated request cannot add a second record.
 */
abstract readonly class Uuid7 implements \Stringable
{
    private const string PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/D';

    /**
     * @param non-empty-string $value
     */
    final private function __construct(public string $value)
    {
    }

    public static function fromString(string $value): static
    {
        return static::tryFrom($value) ?? throw new \InvalidArgumentException(\sprintf('"%s" is not a UUID v7.', $value));
    }

    public static function tryFrom(string $value): ?static
    {
        return '' !== $value && 1 === preg_match(self::PATTERN, $value) ? new static($value) : null;
    }

    // The time comes first, so new rows land at the end of the database index.
    public static function generate(): static
    {
        $bytes = substr(pack('J', (int) floor(microtime(true) * 1000)), 2).random_bytes(10);
        $bytes[6] = \chr(0x70 | (\ord($bytes[6]) & 0x0F));
        $bytes[8] = \chr(0x80 | (\ord($bytes[8]) & 0x3F));

        return static::fromBytes($bytes);
    }

    public static function fromBytes(string $bytes): static
    {
        $hex = bin2hex($bytes);

        return static::fromString(\sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20),
        ));
    }

    public function toBytes(): string
    {
        return (string) hex2bin(str_replace('-', '', $this->value));
    }

    public function equals(self $other): bool
    {
        return $other instanceof static && $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
