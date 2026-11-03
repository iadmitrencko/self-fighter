<?php

declare(strict_types=1);

namespace App\Analytics\Domain;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;

/**
 * A step of a player that §19 counts. It names the user, a guest or an account, and nothing else
 * about the person: the server takes the time itself and the user from the device cookie (R5).
 */
final class Event
{
    // A year shows whether players come back; older events are deleted.
    public const int RETENTION_MONTHS = 12;

    private function __construct(
        private readonly EventId $id,
        private readonly EventName $name,
        private readonly string $mode,
        private readonly ?string $outcome,
        private readonly ?string $error,
        private readonly ?UserId $user,
        private readonly \DateTimeImmutable $occurredAt,
    ) {
    }

    /**
     * Takes an event of backend/schema/event.schema.json. Returns null when its fields are missing.
     *
     * @param array<mixed> $fields
     */
    public static function record(EventId $id, array $fields, ?UserId $user, \DateTimeImmutable $occurredAt): ?self
    {
        $name = EventName::tryFrom(self::text($fields['name'] ?? null));
        $mode = self::text($fields['mode'] ?? null);

        if (null === $name || '' === $mode) {
            return null;
        }

        return new self(
            $id,
            $name,
            $mode,
            self::optional($fields['outcome'] ?? null),
            self::optional($fields['error'] ?? null),
            $user,
            $occurredAt,
        );
    }

    /**
     * The event as the export of the user shows it (§15.5).
     *
     * @return array<string, string>
     */
    public function describe(): array
    {
        return array_filter([
            'name' => $this->name->value,
            'mode' => $this->mode,
            'outcome' => $this->outcome,
            'error' => $this->error,
            'occurredAt' => Instant::format($this->occurredAt),
        ], static fn (?string $value): bool => null !== $value);
    }

    private static function text(mixed $value): string
    {
        return \is_string($value) ? $value : '';
    }

    private static function optional(mixed $value): ?string
    {
        return \is_string($value) ? $value : null;
    }
}
