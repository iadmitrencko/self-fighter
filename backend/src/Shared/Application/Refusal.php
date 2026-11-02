<?php

declare(strict_types=1);

namespace App\Shared\Application;

/**
 * A request the rules of the application refuse. The error code tells the browser what to explain.
 */
final class Refusal extends \RuntimeException
{
    private function __construct(public readonly RefusalReason $reason, public readonly string $error)
    {
        parent::__construct($error);
    }

    // The input breaks the format or the limits.
    public static function invalid(string $error): self
    {
        return new self(RefusalReason::Invalid, $error);
    }

    // The input contradicts what is already saved.
    public static function conflict(string $error): self
    {
        return new self(RefusalReason::Conflict, $error);
    }

    // The user of the request no longer exists, for example after deleting the data in another tab.
    public static function userGone(): self
    {
        return new self(RefusalReason::UserGone, 'unauthorized');
    }
}
