<?php

declare(strict_types=1);

namespace App\Account\Domain;

/**
 * The secret in the device cookie: 256 random bits, base64url without padding.
 */
final readonly class DeviceToken
{
    private function __construct(public string $value)
    {
    }

    public static function generate(): self
    {
        return new self(rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='));
    }

    public static function tryFrom(string $value): ?self
    {
        return 1 === preg_match('/^[A-Za-z0-9_-]{43}$/D', $value) ? new self($value) : null;
    }

    public function hash(): string
    {
        return hash('sha256', $this->value);
    }
}
